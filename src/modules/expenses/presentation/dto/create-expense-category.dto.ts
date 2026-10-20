import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { EXPENSE_CATEGORY_NAME_MAX_LENGTH } from '../../domain/validations/expense-category-validation';

export class CreateExpenseCategoryDto {
  @ApiProperty({
    example: 'Coffee',
    maxLength: EXPENSE_CATEGORY_NAME_MAX_LENGTH,
    description: 'Name of the expense category.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(EXPENSE_CATEGORY_NAME_MAX_LENGTH)
  name!: string;
}
