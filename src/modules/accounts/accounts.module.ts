import { Module } from '@nestjs/common';

import { AccountsService } from './application/services/accounts.service';
import { AccountRepository } from './domain/repositories/account.repository';
import { PrismaAccountRepository } from './infrastructure/repositories/prisma-account.repository';
import { AccountsController } from './presentation/controllers/accounts.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [AccountsController],
  providers: [
    AccountsService,
    {
      provide: AccountRepository,
      useClass: PrismaAccountRepository,
    },
  ],
  exports: [AccountsService, AccountRepository],
})
export class AccountsModule {}
