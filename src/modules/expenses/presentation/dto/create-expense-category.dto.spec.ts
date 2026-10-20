import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateExpenseCategoryDto } from './create-expense-category.dto';
import { EXPENSE_CATEGORY_NAME_MAX_LENGTH } from '../../domain/validations/expense-category-validation';

describe('CreateExpenseCategoryDto', () => {
  const toDto = (name: unknown) =>
    plainToInstance(CreateExpenseCategoryDto, { name });

  it('should accept a valid name', async () => {
    expect(await validate(toDto('Groceries'))).toHaveLength(0);
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

  it('should reject a non-string name', async () => {
    expect(await validate(toDto(123))).not.toHaveLength(0);
  });
});
