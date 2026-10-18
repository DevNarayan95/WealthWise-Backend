import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { ApplicationException } from '../../common/exceptions/application.exception';
import { ErrorCode } from '../../common/constants/error-code.constant';
import type { AppConfig } from '../../config/app-config';

export interface AuthenticatedApiClient {
  name: string;
  platform: string;
}

type ApiClientRequest = Request & { apiClient?: AuthenticatedApiClient };

interface KeyDigest {
  client: AuthenticatedApiClient;
  digest: Buffer;
}

const sha256 = (value: string): Buffer =>
  createHash('sha256').update(value, 'utf8').digest();

/**
 * Only requests carrying a key issued to a known client application
 * (web frontend, mobile app, ...) may reach the API. Keys are compared as
 * SHA-256 digests in constant time, and every client is checked so the
 * response time does not reveal which key matched.
 */
@Injectable()
export class ApiClientGuard implements CanActivate {
  private readonly headerName: string;
  private readonly keyDigests: KeyDigest[];

  constructor(
    private readonly reflector: Reflector,
    configService: ConfigService<AppConfig, true>,
  ) {
    const security =
      configService.getOrThrow<AppConfig['security']>('security');

    this.headerName = security.apiKeyHeader;
    this.keyDigests = security.apiClients.map((client) => ({
      client: { name: client.name, platform: client.platform },
      digest: sha256(client.key),
    }));
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<ApiClientRequest>();
    const providedKey = request.headers[this.headerName];

    if (providedKey === undefined) {
      throw new ApplicationException(
        ErrorCode.API_KEY_MISSING,
        'API client key is required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const matchedClient = this.findClient(providedKey);

    if (!matchedClient) {
      throw new ApplicationException(
        ErrorCode.API_KEY_INVALID,
        'API client key is invalid',
        HttpStatus.UNAUTHORIZED,
      );
    }

    request.apiClient = matchedClient;

    return true;
  }

  private findClient(
    providedKey: string | string[],
  ): AuthenticatedApiClient | undefined {
    if (typeof providedKey !== 'string' || providedKey.length === 0) {
      return undefined;
    }

    const providedDigest = sha256(providedKey);
    let matchedClient: AuthenticatedApiClient | undefined;

    for (const entry of this.keyDigests) {
      const isEqual = timingSafeEqual(providedDigest, entry.digest);

      if (isEqual && !matchedClient) {
        matchedClient = entry.client;
      }
    }

    return matchedClient;
  }
}
