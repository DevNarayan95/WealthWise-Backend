import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { ErrorCode } from '../constants/error-code.constant';
import {
  ApiErrorDetail,
  ApiErrorResponse,
} from '../interfaces/api-error-response.interface';

interface NestHttpExceptionResponse {
  code?: ErrorCode;
  message?: string | string[];
  error?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();

    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;

    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : undefined;

    const { code, message, details } = this.normalizeException(
      statusCode,
      exceptionResponse,
    );

    const errorResponse: ApiErrorResponse = {
      success: false,
      statusCode,
      error: {
        code,
        message,
        ...(details?.length ? { details } : {}),
      },
      meta: {},
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    };

    response.status(statusCode).json(errorResponse);
  }

  private normalizeException(
    statusCode: HttpStatus,
    exceptionResponse: string | object | undefined,
  ): {
    code: ErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  } {
    if (!exceptionResponse) {
      return {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      };
    }

    if (typeof exceptionResponse === 'string') {
      return {
        code: this.getErrorCode(statusCode),
        message: exceptionResponse,
      };
    }

    const exceptionData = exceptionResponse as NestHttpExceptionResponse;

    if (Array.isArray(exceptionData.message)) {
      return {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Request validation failed',
        details: exceptionData.message.map((message) => ({ message })),
      };
    }

    return {
      code: exceptionData.code ?? this.getErrorCode(statusCode),
      message:
        typeof exceptionData.message === 'string'
          ? exceptionData.message
          : (exceptionData.error ?? 'An unexpected error occurred'),
    };
  }

  private getErrorCode(statusCode: number): ErrorCode {
    const errorCodeMap: Record<number, ErrorCode> = {
      [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
      [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
      [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ErrorCode.RESOURCE_NOT_FOUND,
      [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
    };

    return errorCodeMap[statusCode] ?? ErrorCode.INTERNAL_SERVER_ERROR;
  }
}
