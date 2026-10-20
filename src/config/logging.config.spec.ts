import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import pino from 'pino';

import type { AppConfig } from './app-config';
import {
  buildPinoHttpOptions,
  createLogDestinations,
  resolveLogsPath,
  resolveRequestId,
} from './logging.config';

type LoggingConfig = AppConfig['logging'];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const baseLoggingConfig: LoggingConfig = {
  level: 'info',
  pretty: false,
  logsPath: 'logs',
  retentionDays: 30,
  redactPaths: ['req.headers.authorization', 'body.password'],
};

const pad = (value: number): string => String(value).padStart(2, '0');

const todayStamp = (): string => {
  const now = new Date();

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const readJsonLines = (filePath: string): Record<string, unknown>[] =>
  fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);

describe('logging config helpers', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'navro-logging-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('resolveLogsPath', () => {
    it('resolves a relative logsPath against the project root', () => {
      expect(resolveLogsPath('logs', tempDir)).toBe(path.join(tempDir, 'logs'));
    });

    it('keeps an absolute logsPath unchanged', () => {
      const absolute = path.join(tempDir, 'elsewhere');

      expect(resolveLogsPath(absolute, '/some/other/root')).toBe(absolute);
    });
  });

  describe('resolveRequestId', () => {
    it('keeps a valid x-request-id', () => {
      expect(resolveRequestId('req-abc.123_X')).toBe('req-abc.123_X');
    });

    it.each([
      ['contains spaces', 'bad id'],
      ['contains newlines', 'line\nbreak'],
      ['exceeds 128 characters', 'a'.repeat(129)],
      ['is an empty string', ''],
      ['is an array', ['a', 'b']],
      ['is missing', undefined],
    ])('generates a UUID when the header %s', (_label, value) => {
      expect(resolveRequestId(value)).toMatch(UUID_PATTERN);
    });
  });

  describe('redaction', () => {
    it('redacts configured paths in emitted log lines', () => {
      const lines: string[] = [];
      const { redact } = buildPinoHttpOptions(baseLoggingConfig);
      const logger = pino(
        { redact },
        { write: (chunk: string) => lines.push(chunk) },
      );

      logger.info(
        {
          req: { headers: { authorization: 'Bearer secret-token' } },
          body: { password: 'hunter2', name: 'visible' },
        },
        'request',
      );

      const output = lines.join('');

      expect(output).toContain('[REDACTED]');
      expect(output).not.toContain('secret-token');
      expect(output).not.toContain('hunter2');
      expect(output).toContain('visible');
    });
  });

  describe('createLogDestinations', () => {
    it('writes app and error files named by today date under the resolved logs folder', () => {
      const destinations = createLogDestinations(
        { ...baseLoggingConfig, logsPath: 'custom-logs' },
        tempDir,
      );
      const logger = pino({ level: 'info' }, destinations.stream);

      logger.info('hello');
      logger.warn('careful');
      logger.error('boom');
      destinations.close();

      const logsDir = path.join(tempDir, 'custom-logs');
      const stamp = todayStamp();

      expect(fs.readdirSync(logsDir).sort()).toEqual([
        `app-${stamp}.log`,
        `error-${stamp}.log`,
      ]);
    });

    it('sends info and above to the app file and only error-level entries to the error file', () => {
      const destinations = createLogDestinations(
        { ...baseLoggingConfig, logsPath: 'logs' },
        tempDir,
      );
      const logger = pino({ level: 'info' }, destinations.stream);

      logger.debug('ignored');
      logger.info('hello');
      logger.warn('careful');
      logger.error('boom');
      logger.fatal('dead');
      destinations.close();

      const logsDir = path.join(tempDir, 'logs');
      const stamp = todayStamp();
      const appLines = readJsonLines(path.join(logsDir, `app-${stamp}.log`));
      const errorLines = readJsonLines(
        path.join(logsDir, `error-${stamp}.log`),
      );

      expect(appLines.map((line) => line.msg)).toEqual([
        'hello',
        'careful',
        'boom',
        'dead',
      ]);
      expect(errorLines.map((line) => line.msg)).toEqual(['boom', 'dead']);
      expect(errorLines.every((line) => (line.level as number) >= 50)).toBe(
        true,
      );
    });
  });
});
