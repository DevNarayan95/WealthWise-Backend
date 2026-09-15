import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { AccountType } from '../../domain/entities/account.entity';
import { CreateAccountDto } from './create-account.dto';

describe('CreateAccountDto', () => {
  const createDto = (overrides: Partial<CreateAccountDto> = {}) =>
    plainToInstance(CreateAccountDto, {
      name: 'Maybank Savings',
      type: AccountType.BANK_ACCOUNT,
      currency: 'MYR',
      openingBalance: '1000.0000',
      ...overrides,
    });

  it('should accept a valid account payload', async () => {
    const dto = createDto();

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should trim and uppercase currency', async () => {
    const dto = createDto({
      currency: ' myr ',
    });

    expect(dto.currency).toBe('MYR');

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should trim the account name', async () => {
    const dto = createDto({
      name: '  Savings Account  ',
    });

    expect(dto.name).toBe('Savings Account');

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should trim the opening balance', async () => {
    const dto = createDto({
      openingBalance: ' 1000.0000 ',
    });

    expect(dto.openingBalance).toBe('1000.0000');

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should reject an empty account name', async () => {
    const dto = createDto({
      name: '',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });

  it('should reject an account name longer than 150 characters', async () => {
    const dto = createDto({
      name: 'A'.repeat(151),
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });

  it('should reject an invalid account type', async () => {
    const dto = createDto({
      type: 'INVALID_TYPE' as AccountType,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });

  it('should reject an invalid currency length', async () => {
    const dto = createDto({
      currency: 'US',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject non-alphabetic currency values', async () => {
    const dto = createDto({
      currency: '$$$',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept a negative opening balance', async () => {
    const dto = createDto({
      openingBalance: '-2500.5000',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should accept the maximum supported opening balance', async () => {
    const dto = createDto({
      openingBalance: '123456789012345.1234',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should reject more than four decimal places', async () => {
    const dto = createDto({
      openingBalance: '1000.12345',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject values exceeding database precision', async () => {
    const dto = createDto({
      openingBalance: '1234567890123456.1234',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject scientific notation', async () => {
    const dto = createDto({
      openingBalance: '1e5',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
