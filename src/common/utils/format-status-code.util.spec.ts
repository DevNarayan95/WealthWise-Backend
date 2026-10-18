import { formatStatusCode } from './format-status-code.util';

describe('formatStatusCode', () => {
  it('joins the configured prefix and HTTP status with no separator by default', () => {
    expect(formatStatusCode(404, { prefix: 'WS', separator: '' })).toBe(
      'WS404',
    );
  });

  it('applies a configured separator between prefix and status', () => {
    expect(formatStatusCode(500, { prefix: 'WS', separator: '-' })).toBe(
      'WS-500',
    );
  });

  it('keeps the prefix casing exactly as configured', () => {
    expect(formatStatusCode(409, { prefix: 'Ws', separator: '_' })).toBe(
      'Ws_409',
    );
  });
});
