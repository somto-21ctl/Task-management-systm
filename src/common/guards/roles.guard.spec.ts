import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtUser } from '../interfaces/jwt-user.interface';
import { UserRole } from '../../users/user-role.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const handler = jest.fn();
  const controller = jest.fn();
  const user: JwtUser = {
    userId: 'user-id',
    email: 'alex@example.com',
    role: UserRole.USER,
  };
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const context = {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
  let guard: RolesGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows routes without role metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows an admin on an admin-only route', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const adminContext = {
      ...context,
      switchToHttp: () => ({
        getRequest: () => ({ user: { ...user, role: UserRole.ADMIN } }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(adminContext)).toBe(true);
  });

  it('denies a regular user on an admin-only route', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('denies a request without an authenticated user on a role-protected route', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const anonymousContext = {
      ...context,
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(anonymousContext)).toBe(false);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      handler,
      controller,
    ]);
  });
});
