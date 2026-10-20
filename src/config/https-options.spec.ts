import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildHttpsOptions } from './https-options';
import type { SslConfig } from './app-config';

describe('buildHttpsOptions', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'navro-ssl-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  const writePem = (name: string, content: string): string => {
    const path = join(tempDir, name);
    writeFileSync(path, content, 'utf8');
    return path;
  };

  const sslConfig = (overrides: Partial<SslConfig> = {}): SslConfig => ({
    enabled: true,
    keyPath: writePem('server.key', 'KEY-PEM'),
    certPath: writePem('server.crt', 'CERT-PEM'),
    caPath: '',
    ...overrides,
  });

  it('returns undefined when SSL is disabled so Nest serves plain HTTP', () => {
    expect(
      buildHttpsOptions(
        sslConfig({ enabled: false, keyPath: '', certPath: '' }),
      ),
    ).toBeUndefined();
  });

  it('loads the key and certificate when SSL is enabled', () => {
    const options = buildHttpsOptions(sslConfig());

    expect(options?.key?.toString()).toBe('KEY-PEM');
    expect(options?.cert?.toString()).toBe('CERT-PEM');
    expect(options?.ca).toBeUndefined();
  });

  it('loads a CA bundle only when caPath is configured', () => {
    const options = buildHttpsOptions(
      sslConfig({ caPath: writePem('ca.crt', 'CA-PEM') }),
    );

    expect(options?.ca?.toString()).toBe('CA-PEM');
  });
});
