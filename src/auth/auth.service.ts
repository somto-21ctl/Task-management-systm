import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DataSource, MoreThan, Repository } from 'typeorm';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailerService } from './mailer.service';
import { PasswordResetToken } from './password-reset-token.entity';
import { RefreshToken } from './refresh-token.entity';
import { RefreshTokenDto } from './dto/refresh-token.dto';

const PASSWORD_RESET_TOKEN_TTL_MINUTES = 15;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const SESSION_IDLE_TTL_SECONDS = 60 * 60;
const REFRESH_TOKEN_MAX_TTL_SECONDS = 30 * 24 * 60 * 60;
const PASSWORD_RESET_MESSAGE =
  'If an account exists for that email, a password reset link will be sent.';

interface RefreshTokenPayload extends JwtUser {
  jti: string;
  sessionId: string;
  tokenType: 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokens: Repository<PasswordResetToken>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    private readonly dataSource: DataSource,
    private readonly mailer: MailerService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('An account with this email already exists');
    }

    const user = await this.users.create(
      email,
      await hash(dto.password, 12),
      dto.fullName.trim(),
      dto.phoneNumber.trim(),
    );
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
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
    const tokenPair = await this.createTokenPair(payload, randomUUID());
    await this.refreshTokens.save(
      this.refreshTokens.create(tokenPair.refreshTokenRecord),
    );
    return tokenPair.response;
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(
        dto.refreshToken,
        { secret: this.refreshTokenSecret },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.tokenType !== 'refresh' || !payload.jti || !payload.sessionId) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return this.dataSource.transaction(async (manager) => {
      const existingToken = await manager.findOne(RefreshToken, {
        where: { tokenHash: this.hashToken(dto.refreshToken) },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !existingToken ||
        existingToken.tokenId !== payload.jti ||
        existingToken.sessionId !== payload.sessionId ||
        existingToken.expiresAt <= new Date()
      ) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      await manager.delete(RefreshToken, { id: existingToken.id });
      const tokenPair = await this.createTokenPair(
        {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
        },
        existingToken.sessionId,
      );
      await manager.save(
        RefreshToken,
        this.refreshTokens.create(tokenPair.refreshTokenRecord),
      );
      return tokenPair.response;
    });
  }

  async logout(dto: RefreshTokenDto) {
    const token = await this.refreshTokens.findOne({
      where: { tokenHash: this.hashToken(dto.refreshToken) },
    });
    if (token) {
      await this.refreshTokens.delete({ sessionId: token.sessionId });
    }
    return { message: 'Logged out successfully.' };
  }

  async touchSession(user: JwtUser): Promise<void> {
    if (!user.sessionId) {
      throw new UnauthorizedException(
        'Session has expired; please log in again',
      );
    }

    const result = await this.refreshTokens.update(
      {
        sessionId: user.sessionId,
        userId: user.userId,
        expiresAt: MoreThan(new Date()),
      },
      {
        expiresAt: new Date(Date.now() + SESSION_IDLE_TTL_SECONDS * 1000),
      },
    );
    if (!result.affected) {
      throw new UnauthorizedException(
        'Session has expired; please log in again',
      );
    }
  }

  async getProfile(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
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
      await manager.delete(RefreshToken, { userId: resetToken.userId });
    });

    return { message: 'Password has been reset successfully.' };
  }

  private async createTokenPair(user: JwtUser, sessionId: string) {
    const accessToken = await this.jwt.signAsync({ ...user, sessionId });
    const tokenId = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { ...user, jti: tokenId, sessionId, tokenType: 'refresh' },
      {
        secret: this.refreshTokenSecret,
        expiresIn: REFRESH_TOKEN_MAX_TTL_SECONDS,
      },
    );
    const expiresAt = new Date(Date.now() + SESSION_IDLE_TTL_SECONDS * 1000);

    return {
      response: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer' as const,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        sessionIdleTimeoutSeconds: SESSION_IDLE_TTL_SECONDS,
      },
      refreshTokenRecord: {
        userId: user.userId,
        tokenId,
        sessionId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    };
  }

  private get refreshTokenSecret(): string {
    return this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
