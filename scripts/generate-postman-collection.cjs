'use strict';

// Builds a Postman collection from the running server's OpenAPI document.
// Secrets are never written: the API key and access token become Postman variables.

const fs = require('node:fs');
const path = require('node:path');
const Converter = require('openapi-to-postmanv2');

const OPENAPI_URL =
  process.env.OPENAPI_URL ?? 'http://localhost:3000/docs-json';
const OUTPUT_FILE =
  process.env.POSTMAN_OUTPUT ??
  path.join(
    __dirname,
    '..',
    'docs',
    'postman',
    'wealthwise.postman_collection.json',
  );

const API_KEY_VARIABLE = '{{apiKey}}';
const ACCESS_TOKEN_VARIABLE = '{{accessToken}}';

function convertSpec(spec) {
  return new Promise((resolve, reject) => {
    Converter.convert(
      { type: 'json', data: spec },
      {
        folderStrategy: 'Tags',
        requestParametersResolution: 'Example',
        exampleParametersResolution: 'Example',
        includeAuthInfoInExample: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result.result) {
          reject(new Error(result.reason));
          return;
        }
        resolve(result.output[0].data);
      },
    );
  });
}

// The converter keeps only the first security option, which drops the JWT
// half of the AND requirement. Headers are rebuilt from the OpenAPI document.
function requiresAccessToken(operation) {
  return (operation.security ?? []).some(
    (requirement) => 'access-token' in requirement,
  );
}

function toOpenApiPath(postmanPath) {
  return `/${postmanPath.map((segment) => segment.replace(/^:(.+)$/, '{$1}')).join('/')}`;
}

function applySecurityHeaders(node, spec, apiKeyHeader) {
  if (Array.isArray(node)) {
    node.forEach((child) => applySecurityHeaders(child, spec, apiKeyHeader));
    return;
  }
  if (!node || typeof node !== 'object') {
    return;
  }
  if (node.request && node.request.url) {
    const method = node.request.method.toLowerCase();
    const openApiPath = toOpenApiPath(node.request.url.path ?? []);
    const operation = spec.paths[openApiPath]?.[method];
    const headers = (node.request.header ?? []).filter(
      (header) =>
        header.key.toLowerCase() !== apiKeyHeader.toLowerCase() &&
        header.key !== 'Authorization',
    );
    node.request.auth = { type: 'noauth' };
    if (operation?.security?.length) {
      headers.push({
        key: apiKeyHeader,
        value: API_KEY_VARIABLE,
        type: 'text',
      });
    }
    if (operation && requiresAccessToken(operation)) {
      headers.push({
        key: 'Authorization',
        value: `Bearer ${ACCESS_TOKEN_VARIABLE}`,
        type: 'text',
      });
    }
    node.request.header = headers;
  }
  applySecurityHeaders(node.item ?? [], spec, apiKeyHeader);
}

function withVariables(collection, baseUrl) {
  collection.variable = [
    { key: 'baseUrl', value: baseUrl, type: 'string' },
    { key: 'apiKey', value: '', type: 'secret' },
    { key: 'accessToken', value: '', type: 'secret' },
  ];
  return collection;
}

async function main() {
  const response = await fetch(OPENAPI_URL);
  if (!response.ok) {
    throw new Error(`Could not fetch ${OPENAPI_URL}: HTTP ${response.status}`);
  }
  const spec = await response.json();

  const apiKeyHeader = spec.components.securitySchemes['api-key'].name;
  const baseUrl = new URL(OPENAPI_URL).origin;

  const collection = await convertSpec(spec);
  applySecurityHeaders(collection.item, spec, apiKeyHeader);
  withVariables(collection, baseUrl);

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(collection, null, 2)}\n`);
  process.stdout.write(`Wrote ${OUTPUT_FILE}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  applySecurityHeaders,
  requiresAccessToken,
  toOpenApiPath,
  withVariables,
};
