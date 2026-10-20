import { formatStatusCode } from './format-status-code.util';

describe('formatStatusCode', () => {
  it('joins the configured prefix and HTTP status with no separator by default', () => {
    expect(formatStatusCode(404, { prefix: 'NV', separator: '' })).toBe(
      'NV404',
    );
  });

  it('applies a configured separator between prefix and status', () => {
    expect(formatStatusCode(500, { prefix: 'NV', separator: '-' })).toBe(
      'NV-500',
    );
  });

  it('keeps the prefix casing exactly as configured', () => {
    expect(formatStatusCode(409, { prefix: 'Nv', separator: '_' })).toBe(
      'Nv_409',
    );
  });
});
