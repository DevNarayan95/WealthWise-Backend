import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateExpenseCategoryDto } from './update-expense-category.dto';
import { EXPENSE_CATEGORY_NAME_MAX_LENGTH } from '../../domain/validations/expense-category-validation';

describe('UpdateExpenseCategoryDto', () => {
  const toDto = (name: unknown) =>
    plainToInstance(UpdateExpenseCategoryDto, { name });

  it('should accept a valid name', async () => {
    expect(await validate(toDto('Household'))).toHaveLength(0);
  });

  it('should reject a missing name', async () => {
    expect(await validate(toDto(undefined))).not.toHaveLength(0);
  });

  it('should reject a name longer than the maximum length', async () => {
    const errors = await validate(
      toDto('a'.repeat(EXPENSE_CATEGORY_NAME_MAX_LENGTH + 1)),
    );

    expect(errors).not.toHaveLength(0);
  });
});
