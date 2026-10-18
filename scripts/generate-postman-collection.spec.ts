/* eslint-disable @typescript-eslint/no-require-imports */

interface PostmanItem {
  name: string;
  item?: PostmanItem[];
  request?: {
    method: string;
    url: { path: string[] };
    auth?: { type: string };
    header: { key: string; value: string; type?: string }[];
  };
}

interface Collection {
  item: PostmanItem[];
  variable?: unknown[];
}

const {
  applySecurityHeaders,
  requiresAccessToken,
  toOpenApiPath,
  withVariables,
} = require('./generate-postman-collection.cjs');

const API_KEY_HEADER = 'x-api-key';

const spec = {
  paths: {
    '/api/v1/accounts/{id}': {
      get: {
        security: [{ 'api-key': [], 'access-token': [] }],
      },
    },
    '/api/v1/auth/login': {
      post: {
        security: [{ 'api-key': [] }],
      },
    },
    '/health/live': {
      get: {},
    },
  },
};

describe('generate-postman-collection', () => {
  describe('toOpenApiPath', () => {
    it('converts Postman path parameters to OpenAPI placeholders', () => {
      expect(toOpenApiPath(['api', 'v1', 'accounts', ':id', 'archive'])).toBe(
        '/api/v1/accounts/{id}/archive',
      );
    });
  });

  describe('requiresAccessToken', () => {
    it('is true when the AND requirement includes the access token', () => {
      expect(
        requiresAccessToken({
          security: [{ 'api-key': [], 'access-token': [] }],
        }),
      ).toBe(true);
    });

    it('is false for API-key-only and public operations', () => {
      expect(requiresAccessToken({ security: [{ 'api-key': [] }] })).toBe(
        false,
      );
      expect(requiresAccessToken({})).toBe(false);
    });
  });

  describe('applySecurityHeaders', () => {
    const buildCollection = (): Collection => ({
      item: [
        {
          name: 'Accounts',
          item: [
            {
              name: 'Get account',
              request: {
                method: 'GET',
                url: { path: ['api', 'v1', 'accounts', ':id'] },
                auth: { type: 'apikey' },
                header: [
                  { key: 'Accept', value: 'application/json' },
                  { key: API_KEY_HEADER, value: '<API_KEY>' },
                ],
              },
            },
          ],
        },
        {
          name: 'Login',
          request: {
            method: 'POST',
            url: { path: ['api', 'v1', 'auth', 'login'] },
            header: [],
          },
        },
        {
          name: 'Health',
          request: {
            method: 'GET',
            url: { path: ['health', 'live'] },
            header: [],
          },
        },
      ],
    });

    it('sends the API key and bearer token on AND-protected operations', () => {
      const collection = buildCollection();
      applySecurityHeaders(collection.item, spec, API_KEY_HEADER);

      const request = collection.item[0].item?.[0].request;
      expect(request?.auth).toEqual({ type: 'noauth' });
      expect(request?.header).toEqual([
        { key: 'Accept', value: 'application/json' },
        { key: API_KEY_HEADER, value: '{{apiKey}}', type: 'text' },
        { key: 'Authorization', value: 'Bearer {{accessToken}}', type: 'text' },
      ]);
    });

    it('sends only the API key on API-key-only operations', () => {
      const collection = buildCollection();
      applySecurityHeaders(collection.item, spec, API_KEY_HEADER);

      expect(collection.item[1].request?.header).toEqual([
        { key: API_KEY_HEADER, value: '{{apiKey}}', type: 'text' },
      ]);
    });

    it('sends no security headers on public operations', () => {
      const collection = buildCollection();
      applySecurityHeaders(collection.item, spec, API_KEY_HEADER);

      expect(collection.item[2].request?.header).toEqual([]);
    });
  });

  describe('withVariables', () => {
    it('adds baseUrl and empty secret variables', () => {
      const collection = withVariables({ item: [] }, 'http://localhost:3000');

      expect(collection.variable).toEqual([
        { key: 'baseUrl', value: 'http://localhost:3000', type: 'string' },
        { key: 'apiKey', value: '', type: 'secret' },
        { key: 'accessToken', value: '', type: 'secret' },
      ]);
    });
  });
});
