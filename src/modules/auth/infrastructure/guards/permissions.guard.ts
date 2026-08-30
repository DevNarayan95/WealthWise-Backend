import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserRepository } from '../../../users/domain/repositories/user.repository';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const userId = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException('User identity not available');
    }

    const userPermissions =
      await this.userRepository.findPermissionsByUserId(userId);

    const hasAllPermissions = requiredPermissions.every(
      (permission) =>
        userPermissions.includes(permission) || userPermissions.includes('*'),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
