import { Module } from '@nestjs/common';

import { UsersController } from './controllers/users.controller';
import { PrismaUserRepository } from './repositories/prisma-user.repository';
import { UserRepository } from './domain/repositories/user.repository';
import { UsersService } from './services/users.service';
import { PasswordHasherService } from './services/password-hasher.service';
import { PermissionsGuard } from '../../common/auth/permissions.guard';

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
