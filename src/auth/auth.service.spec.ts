import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import { createHash } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { MailerService } from './mailer.service';
import { PasswordResetToken } from './password-reset-token.entity';
import { RefreshToken } from './refresh-token.entity';

describe('AuthService', () => {
  const users = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  };
  const jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const config = { getOrThrow: jest.fn(() => 'refresh-secret-for-tests') };
  const resetTokens = {
    create: jest.fn((token) => token),
    delete: jest.fn(),
    save: jest.fn(),
  };
  const refreshTokens = {
    create: jest.fn((token) => token),
    save: jest.fn(),
    delete: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const manager = {
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    save: jest.fn(),
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
      config as unknown as ConfigService,
      resetTokens as unknown as Repository<PasswordResetToken>,
      refreshTokens as unknown as Repository<RefreshToken>,
      dataSource as unknown as DataSource,
      mailer as unknown as MailerService,
    );
  });

  it('hashes the password and returns only public registration fields', async () => {
    users.findByEmail.mockResolvedValue(null);
    users.create.mockImplementation(
      async (
        email: string,
        passwordHash: string,
        fullName: string,
        phoneNumber: string,
      ) => ({
        id: 'user-id',
        email,
        fullName,
        phoneNumber,
        passwordHash,
        role: 'user',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    );

    const result = await service.register({
      email: '  Alex@example.com ',
      password: 'a-long-test-password',
      fullName: ' Alex Morgan ',
      phoneNumber: ' +14155552671 ',
    });

    expect(users.create).toHaveBeenCalledWith(
      'alex@example.com',
      expect.any(String),
      'Alex Morgan',
      '+14155552671',
    );
    expect(users.create.mock.calls[0][1]).not.toBe('a-long-test-password');
    expect(result).toEqual({
      id: 'user-id',
      email: 'alex@example.com',
      fullName: 'Alex Morgan',
      phoneNumber: '+14155552671',
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

  it('issues access and refresh tokens and stores only the refresh token hash', async () => {
    const password = 'ValidPassword!2026';
    users.findByEmail.mockResolvedValue({
      id: 'user-id',
      email: 'alex@example.com',
      passwordHash: await hash(password, 4),
      role: 'user',
    });
    jwt.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.login({
      email: 'alex@example.com',
      password,
    });

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      sessionIdleTimeoutSeconds: 3_600,
    });
    expect(refreshTokens.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-id',
        sessionId: expect.any(String),
        tokenHash: createHash('sha256').update('refresh-token').digest('hex'),
        expiresAt: expect.any(Date),
      }),
    );
    expect(refreshTokens.save.mock.calls[0][0].tokenHash).not.toBe(
      'refresh-token',
    );
  });

  it('rotates a refresh token exactly once', async () => {
    const rawRefreshToken = 'old-refresh-token';
    jwt.verifyAsync.mockResolvedValue({
      userId: 'user-id',
      email: 'alex@example.com',
      role: 'user',
      jti: 'old-token-id',
      sessionId: 'session-id',
      tokenType: 'refresh',
    });
    manager.findOne.mockResolvedValue({
      id: 'stored-token-id',
      tokenId: 'old-token-id',
      sessionId: 'session-id',
      expiresAt: new Date(Date.now() + 60_000),
    });
    jwt.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');

    const result = await service.refresh({ refreshToken: rawRefreshToken });

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
    expect(manager.delete).toHaveBeenCalledWith(RefreshToken, {
      id: 'stored-token-id',
    });
    expect(manager.save).toHaveBeenCalledWith(
      RefreshToken,
      expect.objectContaining({
        tokenHash: createHash('sha256')
          .update('new-refresh-token')
          .digest('hex'),
      }),
    );
    expect(manager.findOne).toHaveBeenCalledWith(
      RefreshToken,
      expect.objectContaining({
        where: {
          tokenHash: createHash('sha256').update(rawRefreshToken).digest('hex'),
        },
      }),
    );
  });

  it('rejects invalid refresh tokens', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('bad token'));

    await expect(
      service.refresh({ refreshToken: 'invalid-refresh-token' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(manager.findOne).not.toHaveBeenCalled();
  });

  it('revokes the refresh token on logout', async () => {
    refreshTokens.findOne.mockResolvedValue({ sessionId: 'session-id' });
    await expect(
      service.logout({ refreshToken: 'refresh-token' }),
    ).resolves.toEqual({ message: 'Logged out successfully.' });
    expect(refreshTokens.delete).toHaveBeenCalledWith({
      sessionId: 'session-id',
    });
  });

  it('extends the session idle expiry on authenticated activity', async () => {
    refreshTokens.update.mockResolvedValue({ affected: 1 });
    const before = Date.now();

    await service.touchSession({
      userId: 'user-id',
      email: 'alex@example.com',
      role: 'user',
      sessionId: 'session-id',
    });

    const [where, update] = refreshTokens.update.mock.calls[0];
    expect(where).toEqual(
      expect.objectContaining({
        sessionId: 'session-id',
        userId: 'user-id',
      }),
    );
    expect(update.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + 3_600_000,
    );
  });

  it('rejects an expired or revoked session on activity', async () => {
    refreshTokens.update.mockResolvedValue({ affected: 0 });

    await expect(
      service.touchSession({
        userId: 'user-id',
        email: 'alex@example.com',
        role: 'user',
        sessionId: 'session-id',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
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
    expect(manager.delete).toHaveBeenCalledWith(RefreshToken, {
      userId: 'user-id',
    });
  });
});
