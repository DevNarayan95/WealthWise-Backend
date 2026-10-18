import { ApiSecurity } from '@nestjs/swagger';

export const API_KEY_SECURITY_SCHEME = 'api-key';
export const ACCESS_TOKEN_SECURITY_SCHEME = 'access-token';

/**
 * Documents that a controller needs a valid client API key (x-api-key).
 * Matches ApiClientGuard, which runs on every route not marked @Public().
 */
export const RequiresApiKey = (): ClassDecorator & MethodDecorator =>
  ApiSecurity(API_KEY_SECURITY_SCHEME);

/**
 * Documents that a route needs both the client API key and a JWT access token.
 * A single requirement object means Swagger sends both headers together.
 */
export const RequiresApiKeyAndJwt = (): ClassDecorator & MethodDecorator =>
  ApiSecurity({
    [API_KEY_SECURITY_SCHEME]: [],
    [ACCESS_TOKEN_SECURITY_SCHEME]: [],
  });
