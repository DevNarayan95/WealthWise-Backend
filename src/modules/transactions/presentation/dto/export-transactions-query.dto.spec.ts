import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ExportFormat } from '../../../../common/export/export-table';
import { TransactionType } from '../../domain/entities/transaction.entity';
import { ExportTransactionsQueryDto } from './export-transactions-query.dto';

describe('ExportTransactionsQueryDto', () => {
  const toDto = (input: Record<string, unknown>) =>
    plainToInstance(ExportTransactionsQueryDto, input);

  const validateDto = (input: Record<string, unknown>) =>
    validate(toDto(input), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

  it('should accept a format with the transaction filters', async () => {
    expect(
      await validateDto({
        format: ExportFormat.CSV,
        from: '2026-01-01',
        to: '2026-01-31',
        type: TransactionType.EXPENSE,
        expenseCategoryId: '3f2b9c1e-7d4a-4b8e-9f10-2a6c5d8e1b47',
      }),
    ).toHaveLength(0);
  });

  it('should reject a missing format', async () => {
    expect(await validateDto({ from: '2026-01-01' })).not.toHaveLength(0);
  });

  it('should reject an unsupported format', async () => {
    expect(await validateDto({ format: 'xlsx' })).not.toHaveLength(0);
  });

  it('should reject pagination parameters because exports are not paged', async () => {
    expect(
      await validateDto({ format: ExportFormat.PDF, page: 1 }),
    ).not.toHaveLength(0);
    expect(
      await validateDto({ format: ExportFormat.PDF, limit: 20 }),
    ).not.toHaveLength(0);
  });

  it('should reject a malformed from date', async () => {
    expect(
      await validateDto({ format: ExportFormat.CSV, from: '01-01-2026' }),
    ).not.toHaveLength(0);
  });
});
