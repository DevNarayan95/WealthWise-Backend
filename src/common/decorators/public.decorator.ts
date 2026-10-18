import { SetMetadata } from '@nestjs/common';

import { readAppConfigFile } from '../../config/app-config';

export const IS_PUBLIC_KEY =
  readAppConfigFile().security.publicRouteMetadataKey;

/**
 * Marks a route as reachable without an API client key.
 * Reserved for infrastructure probes (health checks) only.
 */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
