import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { TransactionsService } from './application/services/transactions.service';
import { TransactionRepository } from './domain/repositories/transaction.repository';
import { PrismaTransactionRepository } from './infrastructure/repositories/prisma-transaction.repository';
import { TransactionsController } from './presentation/controllers/transactions.controller';

@Module({
  imports: [AccountsModule],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    {
      provide: TransactionRepository,
      useClass: PrismaTransactionRepository,
    },
  ],
  exports: [TransactionsService, TransactionRepository],
})
export class TransactionsModule {}
