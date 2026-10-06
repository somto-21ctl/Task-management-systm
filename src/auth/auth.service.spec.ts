import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { MailerService } from './mailer.service';
import { PasswordResetToken } from './password-reset-token.entity';

describe('AuthService', () => {
  const users = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  };
  const jwt = { signAsync: jest.fn() };
  const resetTokens = {
    create: jest.fn((token) => token),
    delete: jest.fn(),
    save: jest.fn(),
  };
  const manager = {
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn((callback) => callback(manager)),
  };
  const mailer = {
    assertConfigured: jest.fn(),
    createPasswordResetUrl: jest.fn(
      (token) => `http://localhost:3001/reset-password?token=${token}`,
    ),
    sendPasswordResetEmail: jest.fn(),
  };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    dataSource.transaction.mockImplementation((callback) => callback(manager));
    service = new AuthService(
      users as unknown as UsersService,
      jwt as unknown as JwtService,
      resetTokens as unknown as Repository<PasswordResetToken>,
      dataSource as unknown as DataSource,
      mailer as unknown as MailerService,
    );
  });

  it('hashes the password and returns only public registration fields', async () => {
    users.findByEmail.mockResolvedValue(null);
    users.create.mockImplementation(
      async (email: string, passwordHash: string) => ({
        id: 'user-id',
        email,
        passwordHash,
        role: 'user',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    );

    const result = await service.register({
      email: '  Alex@example.com ',
      password: 'a-long-test-password',
    });

    expect(users.create).toHaveBeenCalledWith(
      'alex@example.com',
      expect.any(String),
    );
    expect(users.create.mock.calls[0][1]).not.toBe('a-long-test-password');
    expect(result).toEqual({
      id: 'user-id',
      email: 'alex@example.com',
      role: 'user',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  });

  it('rejects invalid credentials with a generic response', async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: 'alex@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('returns a generic response without sending mail for an unknown email', async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(
      service.requestPasswordReset({ email: 'unknown@example.com' }),
    ).resolves.toEqual({
      message:
        'If an account exists for that email, a password reset link will be sent.',
    });
    expect(mailer.createPasswordResetUrl).not.toHaveBeenCalled();
    expect(mailer.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('stores only a hashed reset token and emails the single-use link', async () => {
    users.findByEmail.mockResolvedValue({
      id: 'user-id',
      email: 'alex@example.com',
    });

    await service.requestPasswordReset({ email: ' Alex@Example.com ' });

    expect(resetTokens.delete).toHaveBeenCalledWith({ userId: 'user-id' });
    const savedToken = resetTokens.save.mock.calls[0][0];
    const resetUrl = new URL(mailer.sendPasswordResetEmail.mock.calls[0][1]);
    const rawToken = resetUrl.searchParams.get('token');

    if (rawToken === null) {
      throw new Error('Password reset email URL did not include a token');
    }

    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
    expect(savedToken.tokenHash).toBe(
      createHash('sha256').update(rawToken).digest('hex'),
    );
    expect(savedToken.tokenHash).not.toBe(rawToken);
    expect(savedToken.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(mailer.sendPasswordResetEmail).toHaveBeenCalledWith(
      'alex@example.com',
      expect.stringContaining('token='),
      15,
    );
  });

  it('rejects expired or unknown reset tokens', async () => {
    manager.findOne.mockResolvedValue(null);

    await expect(
      service.resetPassword({
        token: 'a'.repeat(64),
        newPassword: 'a-new-long-password',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('updates the password and invalidates reset tokens after successful reset', async () => {
    manager.findOne.mockResolvedValue({
      id: 'reset-token-id',
      userId: 'user-id',
      expiresAt: new Date(Date.now() + 60_000),
    });

    await service.resetPassword({
      token: 'a'.repeat(64),
      newPassword: 'a-new-long-password',
    });

    expect(manager.update).toHaveBeenCalledWith(
      User,
      { id: 'user-id' },
      { passwordHash: expect.any(String) },
    );
    expect(manager.delete).toHaveBeenCalledWith(PasswordResetToken, {
      userId: 'user-id',
    });
  });
});
