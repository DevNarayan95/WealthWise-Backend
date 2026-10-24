import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ExportQueryDto } from './export-query.dto';

describe('ExportQueryDto', () => {
  const toDto = (format: unknown) =>
    plainToInstance(ExportQueryDto, { format });

  it('should accept csv', async () => {
    expect(await validate(toDto('csv'))).toHaveLength(0);
  });

  it('should accept pdf', async () => {
    expect(await validate(toDto('pdf'))).toHaveLength(0);
  });

  it('should reject a missing format', async () => {
    expect(await validate(toDto(undefined))).not.toHaveLength(0);
  });

  it('should reject an unsupported format', async () => {
    expect(await validate(toDto('xlsx'))).not.toHaveLength(0);
  });
});
