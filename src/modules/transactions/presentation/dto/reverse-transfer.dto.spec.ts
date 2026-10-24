import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ReverseTransferDto } from './reverse-transfer.dto';

const toDto = (overrides: Record<string, unknown> = {}) =>
  plainToInstance(ReverseTransferDto, {
    transactionDate: '2026-09-02',
    description: 'Undo transfer',
    ...overrides,
  });

describe('ReverseTransferDto', () => {
  it('accepts a valid payload', async () => {
    const errors = await validate(toDto());

    expect(errors).toHaveLength(0);
  });

  it('accepts a null description', async () => {
    const errors = await validate(toDto({ description: null }));

    expect(errors).toHaveLength(0);
  });

  it('rejects a transaction date that is not YYYY-MM-DD', async () => {
    const errors = await validate(toDto({ transactionDate: '2026/09/02' }));

    expect(errors.map((error) => error.property)).toContain('transactionDate');
  });

  it('rejects a description longer than 255 characters', async () => {
    const errors = await validate(toDto({ description: 'x'.repeat(256) }));

    expect(errors.map((error) => error.property)).toContain('description');
  });
});
