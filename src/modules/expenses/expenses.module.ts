import { Module } from '@nestjs/common';

import { ExpenseCategoriesService } from './application/services/expense-categories.service';
import { ExpenseCategoryRepository } from './domain/repositories/expense-category.repository';
import { PrismaExpenseCategoryRepository } from './infrastructure/repositories/prisma-expense-category.repository';
import { ExpenseCategoriesController } from './presentation/controllers/expense-categories.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [ExpenseCategoriesController],
  providers: [
    ExpenseCategoriesService,
    {
      provide: ExpenseCategoryRepository,
      useClass: PrismaExpenseCategoryRepository,
    },
  ],
  exports: [ExpenseCategoriesService, ExpenseCategoryRepository],
})
export class ExpensesModule {}
