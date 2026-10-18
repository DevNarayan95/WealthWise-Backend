import type { NextFunction, Request, Response } from 'express';
import type { PinoLogger } from 'nestjs-pino';

import { RequestStartLogMiddleware } from './request-start-log.middleware';

describe('RequestStartLogMiddleware', () => {
  const buildLogger = () => ({
    debug: jest.fn(),
    setContext: jest.fn(),
  });

  it('sets its log context to the class name', () => {
    const logger = buildLogger();

    new RequestStartLogMiddleware(logger as unknown as PinoLogger);

    expect(logger.setContext).toHaveBeenCalledWith('RequestStartLogMiddleware');
  });

  it('logs the method and path without the query string, then continues', () => {
    const logger = buildLogger();
    const middleware = new RequestStartLogMiddleware(
      logger as unknown as PinoLogger,
    );
    const next = jest.fn() as unknown as NextFunction;
    const request = {
      method: 'GET',
      path: '/ready',
      originalUrl: '/health/ready?token=secret-token',
    } as unknown as Request;

    middleware.use(request, {} as Response, next);

    expect(logger.debug).toHaveBeenCalledWith(
      { method: 'GET', path: '/health/ready' },
      'Request started',
    );
    expect(JSON.stringify(logger.debug.mock.calls)).not.toContain(
      'secret-token',
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('logs the start only once when Nest mounts it for the same request', () => {
    const logger = buildLogger();
    const middleware = new RequestStartLogMiddleware(
      logger as unknown as PinoLogger,
    );
    const next = jest.fn() as unknown as NextFunction;
    const request = {
      method: 'GET',
      path: '/ready',
      originalUrl: '/health/ready',
    } as unknown as Request;

    middleware.use(request, {} as Response, next);
    middleware.use(request, {} as Response, next);

    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
