import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ApplicationException } from '../exceptions/application.exception';
import { ErrorCode } from '../constants/error-code.constant';
import { AppConfig } from '../../config/app-config';
import { HttpExceptionFilter } from './http-exception.filter';

const buildFilter = (
  errors: Pick<AppConfig['errors'], 'statusCodePrefix' | 'statusCodeSeparator'>,
): HttpExceptionFilter => {
  const configService = {
    getOrThrow: jest.fn().mockReturnValue(errors),
  } as unknown as ConfigService<AppConfig, true>;

  return new HttpExceptionFilter(configService);
};

const buildHost = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const request = {
    id: 'req-123',
    method: 'GET',
    originalUrl: '/api/v1/accounts/abc',
  };

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
};

describe('HttpExceptionFilter', () => {
  const defaultErrors = {
    statusCodePrefix: 'WS',
    statusCodeSeparator: '',
  };

  it('returns a WS-prefixed statusCode and a plain error code for application errors', () => {
    const filter = buildFilter(defaultErrors);
    const { host, status, json } = buildHost();

    filter.catch(
      new ApplicationException(
        ErrorCode.ACCOUNT_NOT_FOUND,
        'Account not found',
        HttpStatus.NOT_FOUND,
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 'WS404',
        error: expect.objectContaining({
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found',
        }),
        meta: { requestId: 'req-123' },
        path: '/api/v1/accounts/abc',
      }),
    );
  });

  it('applies a configured separator to the statusCode', () => {
    const filter = buildFilter({
      statusCodePrefix: 'WS',
      statusCodeSeparator: '-',
    });
    const { host, json } = buildHost();

    filter.catch(
      new ApplicationException(
        ErrorCode.ACCOUNT_NOT_FOUND,
        'Account not found',
        HttpStatus.NOT_FOUND,
      ),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 'WS-404' }),
    );
  });

  it('maps unknown errors to WS500 INTERNAL_SERVER_ERROR without leaking details', () => {
    const filter = buildFilter(defaultErrors);
    const { host, status, json } = buildHost();

    filter.catch(new Error('database password is wrong'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 'WS500',
        error: expect.objectContaining({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        }),
      }),
    );
  });

  it('maps Prisma unique constraint violations to WS409 CONFLICT', () => {
    const filter = buildFilter(defaultErrors);
    const { host, status, json } = buildHost();

    filter.catch(
      { code: 'P2002', clientVersion: '7.0.0', message: 'unique' },
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 'WS409',
        error: expect.objectContaining({ code: ErrorCode.CONFLICT }),
      }),
    );
  });
});
