import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import type { AppConfig } from '../../config/app-config';
import { ErrorCode } from '../constants/error-code.constant';
import {
  ApiErrorDetail,
  ApiErrorResponse,
} from '../interfaces/api-error-response.interface';
import { formatStatusCode } from '../utils/format-status-code.util';

interface NestHttpExceptionResponse {
  code?: ErrorCode;
  message?: string | string[];
  error?: string;
}

interface NormalizedError {
  code: ErrorCode;
  message: string;
  details?: ApiErrorDetail[];
}

const STATUS_TO_ERROR_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.RESOURCE_NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
  [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
};

const PRISMA_UNIQUE_CONSTRAINT_CODE = 'P2002';
const PRISMA_RECORD_NOT_FOUND_CODE = 'P2025';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly errorFormat: AppConfig['errors'];

  constructor(configService: ConfigService<AppConfig, true>) {
    this.errorFormat = configService.getOrThrow<AppConfig['errors']>('errors');
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();

    const request = context.getRequest<Request & { id?: string }>();
    const response = context.getResponse<Response>();

    const { statusCode, error } = this.normalize(exception);

    const internalServerErrorStatus: number = HttpStatus.INTERNAL_SERVER_ERROR;
    if (statusCode >= internalServerErrorStatus) {
      this.logger.error(
        `Unhandled error on ${request.method} ${request.originalUrl}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      statusCode: formatStatusCode(statusCode, {
        prefix: this.errorFormat.statusCodePrefix,
        separator: this.errorFormat.statusCodeSeparator,
      }),
      error: {
        code: error.code,
        message: error.message,
        ...(error.details?.length ? { details: error.details } : {}),
      },
      meta: {
        ...(request.id ? { requestId: request.id } : {}),
      },
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    };

    response.status(statusCode).json(errorResponse);
  }

  private normalize(exception: unknown): {
    statusCode: number;
    error: NormalizedError;
  } {
    if (this.isPrismaError(exception, PRISMA_UNIQUE_CONSTRAINT_CODE)) {
      return {
        statusCode: HttpStatus.CONFLICT,
        error: {
          code: ErrorCode.CONFLICT,
          message: 'The resource already exists',
        },
      };
    }

    if (this.isPrismaError(exception, PRISMA_RECORD_NOT_FOUND_CODE)) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        error: {
          code: ErrorCode.RESOURCE_NOT_FOUND,
          message: 'Resource not found',
        },
      };
    }

    if (!(exception instanceof HttpException)) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        },
      };
    }

    const statusCode = exception.getStatus();

    return {
      statusCode,
      error: this.normalizeHttpException(statusCode, exception.getResponse()),
    };
  }

  private normalizeHttpException(
    statusCode: number,
    exceptionResponse: string | object,
  ): NormalizedError {
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

  private isPrismaError(exception: unknown, code: string): boolean {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      exception.code === code &&
      'clientVersion' in exception
    );
  }

  private getErrorCode(statusCode: number): ErrorCode {
    return STATUS_TO_ERROR_CODE[statusCode] ?? ErrorCode.INTERNAL_SERVER_ERROR;
  }
}
