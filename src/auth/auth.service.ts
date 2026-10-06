import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailerService } from './mailer.service';
import { PasswordResetToken } from './password-reset-token.entity';

const PASSWORD_RESET_TOKEN_TTL_MINUTES = 15;
const PASSWORD_RESET_MESSAGE =
  'If an account exists for that email, a password reset link will be sent.';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokens: Repository<PasswordResetToken>,
    private readonly dataSource: DataSource,
    private readonly mailer: MailerService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('An account with this email already exists');
    }

    const user = await this.users.create(email, await hash(dto.password, 12));
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email.trim().toLowerCase());
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtUser = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    return { accessToken: await this.jwt.signAsync(payload) };
  }

  async getProfile(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async requestPasswordReset(dto: ForgotPasswordDto) {
    this.mailer.assertConfigured();
    const email = dto.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user) return { message: PASSWORD_RESET_MESSAGE };

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const resetUrl = this.mailer.createPasswordResetUrl(token);
    const expiresAt = new Date(
      Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60_000,
    );

    await this.resetTokens.delete({ userId: user.id });
    await this.resetTokens.save(
      this.resetTokens.create({ userId: user.id, tokenHash, expiresAt }),
    );

    await this.mailer.sendPasswordResetEmail(
      user.email,
      resetUrl.toString(),
      PASSWORD_RESET_TOKEN_TTL_MINUTES,
    );

    return { message: PASSWORD_RESET_MESSAGE };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const passwordHash = await hash(dto.newPassword, 12);

    await this.dataSource.transaction(async (manager) => {
      const resetToken = await manager.findOne(PasswordResetToken, {
        where: { tokenHash },
        lock: { mode: 'pessimistic_write' },
      });
      if (!resetToken || resetToken.expiresAt <= new Date()) {
        throw new BadRequestException(
          'Invalid or expired password reset token',
        );
      }

      await manager.update(User, { id: resetToken.userId }, { passwordHash });
      await manager.delete(PasswordResetToken, { userId: resetToken.userId });
    });

    return { message: 'Password has been reset successfully.' };
  }
}
