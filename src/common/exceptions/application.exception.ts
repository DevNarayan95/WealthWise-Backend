import { HttpException, HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../constants/error-code.constant';

export class ApplicationException extends HttpException {
  constructor(code: ErrorCode, message: string, statusCode: HttpStatus) {
    super(
      {
        code,
        message,
      },
      statusCode,
    );
  }
}
