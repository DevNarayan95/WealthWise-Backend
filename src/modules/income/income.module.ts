import { Module } from '@nestjs/common';

import { IncomeCategoriesService } from './application/services/income-categories.service';
import { IncomeCategoryRepository } from './domain/repositories/income-category.repository';
import { PrismaIncomeCategoryRepository } from './infrastructure/repositories/prisma-income-category.repository';
import { IncomeCategoriesController } from './presentation/controllers/income-categories.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [IncomeCategoriesController],
  providers: [
    IncomeCategoriesService,
    {
      provide: IncomeCategoryRepository,
      useClass: PrismaIncomeCategoryRepository,
    },
  ],
  exports: [IncomeCategoriesService, IncomeCategoryRepository],
})
export class IncomeModule {}
