import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { FxModule } from '../fx/fx.module';
import { IncomeModule } from '../income/income.module';
import { UsersModule } from '../users/users.module';
import { TransactionsService } from './application/services/transactions.service';
import { TransfersService } from './application/services/transfers.service';
import { TransactionRepository } from './domain/repositories/transaction.repository';
import { PrismaTransactionRepository } from './infrastructure/repositories/prisma-transaction.repository';
import { TransactionsController } from './presentation/controllers/transactions.controller';
import { TransfersController } from './presentation/controllers/transfers.controller';

@Module({
  imports: [
    AccountsModule,
    ExpensesModule,
    FxModule,
    IncomeModule,
    UsersModule,
  ],
  controllers: [TransactionsController, TransfersController],
  providers: [
    TransactionsService,
    TransfersService,
    {
      provide: TransactionRepository,
      useClass: PrismaTransactionRepository,
    },
  ],
  exports: [TransactionsService, TransactionRepository],
})
export class TransactionsModule {}
