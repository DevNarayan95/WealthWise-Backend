import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../constants/error-code.constant';
import { ExportLimitExceededException } from './export-limit-exceeded.exception';

describe('ExportLimitExceededException', () => {
  it('should use the EXPORT_LIMIT_EXCEEDED code and HTTP 422', () => {
    const exception = new ExportLimitExceededException(5000);

    expect(exception.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(exception.getResponse()).toEqual(
      expect.objectContaining({ code: ErrorCode.EXPORT_LIMIT_EXCEEDED }),
    );
  });

  it('should tell the caller the configured limit and how to narrow the export', () => {
    const exception = new ExportLimitExceededException(5000);

    expect(exception.message).toContain('5000');
  });
});
