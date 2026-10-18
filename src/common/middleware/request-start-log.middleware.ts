import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

/**
 * Logs the start of each request at debug level. The request ID is attached
 * by the request logger, so the start, database, and completion lines share it.
 *
 * Nest mounts a middleware once per matched route, so the same request can
 * reach this class more than once. The WeakSet keeps the start line to one
 * per request. The path comes from originalUrl because req.path is relative to
 * the mount point. The query string is left out because it can carry tokens or
 * personal data.
 */
@Injectable()
export class RequestStartLogMiddleware implements NestMiddleware {
  private readonly loggedRequests = new WeakSet<Request>();

  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(RequestStartLogMiddleware.name);
  }

  use(request: Request, _response: Response, next: NextFunction): void {
    if (!this.loggedRequests.has(request)) {
      this.loggedRequests.add(request);
      const { pathname } = new URL(request.originalUrl, 'http://localhost');
      this.logger.debug(
        { method: request.method, path: pathname },
        'Request started',
      );
    }
    next();
  }
}
