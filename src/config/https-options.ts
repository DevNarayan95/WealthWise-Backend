import { readFileSync } from 'node:fs';

import type { NestApplicationOptions } from '@nestjs/common';

import type { SslConfig } from './app-config';

type HttpsOptions = NestApplicationOptions['httpsOptions'];

export const buildHttpsOptions = (ssl: SslConfig): HttpsOptions => {
  if (!ssl.enabled) {
    return undefined;
  }

  const options: NonNullable<HttpsOptions> = {
    key: readFileSync(ssl.keyPath),
    cert: readFileSync(ssl.certPath),
  };

  if (ssl.caPath) {
    options.ca = readFileSync(ssl.caPath);
  }

  return options;
};
