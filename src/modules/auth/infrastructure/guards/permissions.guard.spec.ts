import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserRepository } from '../../../users/domain/repositories/user.repository';

import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let userRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    userRepository = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findPermissionsByUserId: jest.fn(),
    };

    guard = new PermissionsGuard(reflector, userRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function createExecutionContext(user?: {
    userId: string;
    email: string;
  }): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  describe('when no permissions are required', () => {
    it('should allow the request', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const context = createExecutionContext();

      await expect(guard.canActivate(context)).resolves.toBe(true);

      expect(userRepository.findPermissionsByUserId).not.toHaveBeenCalled();
    });
  });

  describe('when permissions are required', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(['users:create']);
    });

    it('should allow a user with the required permission', async () => {
      userRepository.findPermissionsByUserId.mockResolvedValue([
        'users:create',
      ]);

      const context = createExecutionContext({
        userId: 'user-id',
        email: 'test@example.com',
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);

      expect(userRepository.findPermissionsByUserId).toHaveBeenCalledWith(
        'user-id',
      );
    });

    it('should reject a user without the required permission', async () => {
      userRepository.findPermissionsByUserId.mockResolvedValue(['users:read']);

      const context = createExecutionContext({
        userId: 'user-id',
        email: 'test@example.com',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        'Insufficient permissions',
      );
    });

    it('should allow a user with wildcard permission', async () => {
      userRepository.findPermissionsByUserId.mockResolvedValue(['*']);

      const context = createExecutionContext({
        userId: 'user-id',
        email: 'test@example.com',
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should reject a request without authenticated user identity', async () => {
      const context = createExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(
        'User identity not available',
      );

      expect(userRepository.findPermissionsByUserId).not.toHaveBeenCalled();
    });
  });

  describe('when multiple permissions are required', () => {
    it('should require all permissions', async () => {
      reflector.getAllAndOverride.mockReturnValue([
        'users:create',
        'users:read',
      ]);

      userRepository.findPermissionsByUserId.mockResolvedValue([
        'users:create',
      ]);

      const context = createExecutionContext({
        userId: 'user-id',
        email: 'test@example.com',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        'Insufficient permissions',
      );
    });

    it('should allow a user who has all required permissions', async () => {
      reflector.getAllAndOverride.mockReturnValue([
        'users:create',
        'users:read',
      ]);

      userRepository.findPermissionsByUserId.mockResolvedValue([
        'users:create',
        'users:read',
      ]);

      const context = createExecutionContext({
        userId: 'user-id',
        email: 'test@example.com',
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should allow wildcard permission for multiple required permissions', async () => {
      reflector.getAllAndOverride.mockReturnValue([
        'users:create',
        'users:read',
      ]);

      userRepository.findPermissionsByUserId.mockResolvedValue(['*']);

      const context = createExecutionContext({
        userId: 'user-id',
        email: 'test@example.com',
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });

  it('should read permissions metadata from the handler and class', async () => {
    reflector.getAllAndOverride.mockReturnValue(['users:create']);

    userRepository.findPermissionsByUserId.mockResolvedValue(['users:create']);

    const context = createExecutionContext({
      userId: 'user-id',
      email: 'test@example.com',
    });

    await guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
