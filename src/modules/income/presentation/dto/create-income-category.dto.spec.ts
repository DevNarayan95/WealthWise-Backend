import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateIncomeCategoryDto } from './create-income-category.dto';
import { INCOME_CATEGORY_NAME_MAX_LENGTH } from '../../domain/validations/income-category-validation';

describe('CreateIncomeCategoryDto', () => {
  const toDto = (name: unknown) =>
    plainToInstance(CreateIncomeCategoryDto, { name });

  it('should accept a valid name', async () => {
    expect(await validate(toDto('Freelance'))).toHaveLength(0);
  });

  it('should reject a missing name', async () => {
    expect(await validate(toDto(undefined))).not.toHaveLength(0);
  });

  it('should reject a name longer than the maximum length', async () => {
    const errors = await validate(
      toDto('a'.repeat(INCOME_CATEGORY_NAME_MAX_LENGTH + 1)),
    );

    expect(errors).not.toHaveLength(0);
  });

  it('should reject a non-string name', async () => {
    expect(await validate(toDto(123))).not.toHaveLength(0);
  });
});
