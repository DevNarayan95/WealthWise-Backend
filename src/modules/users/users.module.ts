import { Module } from '@nestjs/common';

import { UsersController } from './presentation/controllers/users.controller';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { UserRepository } from './domain/repositories/user.repository';
import { UsersService } from './application/services/users.service';
import { PasswordHasherService } from '../../infrastructure/security/password-hasher.service';
import { PermissionsGuard } from '../auth/infrastructure/guards/permissions.guard';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    PasswordHasherService,
    PrismaUserRepository,
    PermissionsGuard,
    {
      provide: UserRepository,
      useExisting: PrismaUserRepository,
    },
  ],
  exports: [UsersService, UserRepository, PasswordHasherService],
})
export class UsersModule {}
