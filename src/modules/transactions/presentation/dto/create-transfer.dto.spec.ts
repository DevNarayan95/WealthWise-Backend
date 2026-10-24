import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateTransferDto } from './create-transfer.dto';

const validPayload = {
  sourceAccountId: 'b7c4a3d2-7e9f-4f3b-8e6a-1d2c3b4a5e6f',
  destinationAccountId: 'c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
  amount: '50.00',
  transactionDate: '2026-09-01',
  description: 'Savings top-up',
};

const toDto = (overrides: Record<string, unknown> = {}) =>
  plainToInstance(CreateTransferDto, { ...validPayload, ...overrides });

describe('CreateTransferDto', () => {
  it('accepts a valid payload', async () => {
    const errors = await validate(toDto());

    expect(errors).toHaveLength(0);
  });

  it('accepts a payload without a description', async () => {
    const payload: Record<string, unknown> = { ...validPayload };
    delete payload.description;

    const errors = await validate(plainToInstance(CreateTransferDto, payload));

    expect(errors).toHaveLength(0);
  });

  it('rejects a non-UUID source account id', async () => {
    const errors = await validate(toDto({ sourceAccountId: 'not-a-uuid' }));

    expect(errors.map((error) => error.property)).toContain('sourceAccountId');
  });

  it('rejects a non-UUID destination account id', async () => {
    const errors = await validate(
      toDto({ destinationAccountId: 'not-a-uuid' }),
    );

    expect(errors.map((error) => error.property)).toContain(
      'destinationAccountId',
    );
  });

  it.each(['0', '-5', '1.00001', '12.345678', 'ten'])(
    'rejects invalid amount %s',
    async (amount) => {
      const errors = await validate(toDto({ amount }));

      expect(errors.map((error) => error.property)).toContain('amount');
    },
  );

  it('rejects a transaction date that is not YYYY-MM-DD', async () => {
    const errors = await validate(toDto({ transactionDate: '01-09-2026' }));

    expect(errors.map((error) => error.property)).toContain('transactionDate');
  });

  it('rejects a description longer than 255 characters', async () => {
    const errors = await validate(toDto({ description: 'x'.repeat(256) }));

    expect(errors.map((error) => error.property)).toContain('description');
  });

  it('rejects unknown properties such as a transfer type', async () => {
    const errors = await validate(toDto({ type: 'TRANSFER_OUT' }), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.map((error) => error.property)).toContain('type');
  });
});
