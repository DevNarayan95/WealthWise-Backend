import request, { type Test } from 'supertest';

import { readAppConfigFile } from '../../../src/config/app-config';

type RequestTarget = Parameters<typeof request>[0];

/**
 * Wraps supertest so every e2e call carries the API key of the web frontend
 * client, exactly as the real React app does. The header name comes from
 * config so the tests follow any change to `security.apiKeyHeader`.
 */
export const apiRequest = (target: RequestTarget) => {
  const agent = request(target);

  const withApiKey = (test: Test): Test =>
    test.set(
      readAppConfigFile().security.apiKeyHeader,
      process.env.API_KEY_WEB_FRONTEND ?? '',
    );

  return {
    get: (url: string) => withApiKey(agent.get(url)),
    post: (url: string) => withApiKey(agent.post(url)),
    put: (url: string) => withApiKey(agent.put(url)),
    patch: (url: string) => withApiKey(agent.patch(url)),
    delete: (url: string) => withApiKey(agent.delete(url)),
  };
};

export default apiRequest;
