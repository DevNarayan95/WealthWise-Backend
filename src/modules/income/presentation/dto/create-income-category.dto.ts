import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { INCOME_CATEGORY_NAME_MAX_LENGTH } from '../../domain/validations/income-category-validation';

export class CreateIncomeCategoryDto {
  @ApiProperty({
    example: 'Freelance',
    maxLength: INCOME_CATEGORY_NAME_MAX_LENGTH,
    description: 'Name of the income category.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(INCOME_CATEGORY_NAME_MAX_LENGTH)
  name!: string;
}
