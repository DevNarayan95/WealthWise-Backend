import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { ApiClientGuard } from './api-client.guard';
import { ErrorCode } from '../../common/constants/error-code.constant';
import { ApplicationException } from '../../common/exceptions/application.exception';
import type { AppConfig } from '../../config/app-config';

const WEB_KEY = 'w'.repeat(40);
const MOBILE_KEY = 'm'.repeat(40);

const securityConfig = {
  apiKeyHeader: 'x-api-key',
  apiClients: [
    {
      name: 'web-frontend',
      platform: 'web',
      keyEnv: 'API_KEY_WEB_FRONTEND',
      key: WEB_KEY,
    },
    {
      name: 'mobile-app',
      platform: 'mobile',
      keyEnv: 'API_KEY_MOBILE_APP',
      key: MOBILE_KEY,
    },
  ],
};

describe('ApiClientGuard', () => {
  let reflector: Reflector;
  let guard: ApiClientGuard;

  const buildGuard = (): ApiClientGuard => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue(securityConfig),
    } as unknown as ConfigService<AppConfig, true>;

    return new ApiClientGuard(reflector, configService);
  };

  const buildContext = (
    headers: Record<string, string | string[]>,
  ): {
    context: ExecutionContext;
    request: Request & Record<string, unknown>;
  } => {
    const request = { headers } as unknown as Request & Record<string, unknown>;
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    return { context, request };
  };

  const captureError = (run: () => unknown): unknown => {
    try {
      run();
    } catch (error) {
      return error;
    }

    throw new Error('Expected the guard to throw');
  };

  beforeEach(() => {
    reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    guard = buildGuard();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should allow public routes without checking the API key', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    guard = buildGuard();
    const { context } = buildContext({});

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject a request without the API key header', () => {
    const { context } = buildContext({});

    const error = captureError(() => guard.canActivate(context));

    expect(error).toBeInstanceOf(ApplicationException);
    expect((error as ApplicationException).getStatus()).toBe(
      HttpStatus.UNAUTHORIZED,
    );
    expect((error as ApplicationException).getResponse()).toEqual({
      code: ErrorCode.API_KEY_MISSING,
      message: 'API client key is required',
    });
  });

  it('should reject an unknown API key', () => {
    const { context } = buildContext({ 'x-api-key': 'z'.repeat(40) });

    const error = captureError(() => guard.canActivate(context));

    expect(error).toBeInstanceOf(ApplicationException);
    expect((error as ApplicationException).getStatus()).toBe(
      HttpStatus.UNAUTHORIZED,
    );
    expect((error as ApplicationException).getResponse()).toEqual({
      code: ErrorCode.API_KEY_INVALID,
      message: 'API client key is invalid',
    });
  });

  it('should reject an empty API key', () => {
    const { context } = buildContext({ 'x-api-key': '' });

    const error = captureError(() => guard.canActivate(context));

    expect((error as ApplicationException).getResponse()).toEqual(
      expect.objectContaining({ code: ErrorCode.API_KEY_INVALID }),
    );
  });

  it('should reject a repeated API key header', () => {
    const { context } = buildContext({ 'x-api-key': [WEB_KEY, WEB_KEY] });

    const error = captureError(() => guard.canActivate(context));

    expect((error as ApplicationException).getResponse()).toEqual(
      expect.objectContaining({ code: ErrorCode.API_KEY_INVALID }),
    );
  });

  it('should accept the web frontend key and attach its client identity', () => {
    const { context, request } = buildContext({ 'x-api-key': WEB_KEY });

    expect(guard.canActivate(context)).toBe(true);
    expect(request.apiClient).toEqual({
      name: 'web-frontend',
      platform: 'web',
    });
  });

  it('should accept the mobile app key and attach its client identity', () => {
    const { context, request } = buildContext({ 'x-api-key': MOBILE_KEY });

    expect(guard.canActivate(context)).toBe(true);
    expect(request.apiClient).toEqual({
      name: 'mobile-app',
      platform: 'mobile',
    });
  });

  it('should not expose the secret key on the attached client identity', () => {
    const { context, request } = buildContext({ 'x-api-key': WEB_KEY });

    guard.canActivate(context);

    expect(JSON.stringify(request.apiClient)).not.toContain(WEB_KEY);
  });
});
