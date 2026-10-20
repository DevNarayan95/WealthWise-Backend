import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateIncomeCategoryDto } from './update-income-category.dto';
import { INCOME_CATEGORY_NAME_MAX_LENGTH } from '../../domain/validations/income-category-validation';

describe('UpdateIncomeCategoryDto', () => {
  const toDto = (name: unknown) =>
    plainToInstance(UpdateIncomeCategoryDto, { name });

  it('should accept a valid name', async () => {
    expect(await validate(toDto('Consulting'))).toHaveLength(0);
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
});
