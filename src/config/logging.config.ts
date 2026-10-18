import crypto from 'node:crypto';
import path from 'node:path';

import { ConfigService } from '@nestjs/config';
import pino, { type DestinationStream } from 'pino';
import pinoPretty from 'pino-pretty';
import { LoggerModule } from 'nestjs-pino';

import type { AppConfig } from './app-config';
import { createDailyLogFile } from './daily-log-file';

type LoggingConfig = AppConfig['logging'];

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;
const APP_LOG_BASE_NAME = 'app';
const ERROR_LOG_BASE_NAME = 'error';

export interface LogDestinations {
  stream: DestinationStream;
  close: () => void;
}

export const resolveLogsPath = (
  logsPath: string,
  rootDir: string = process.cwd(),
): string => path.resolve(rootDir, logsPath);

export const resolveRequestId = (value: unknown): string =>
  typeof value === 'string' && REQUEST_ID_PATTERN.test(value)
    ? value
    : crypto.randomUUID();

export const createLogDestinations = (
  logging: LoggingConfig,
  rootDir?: string,
): LogDestinations => {
  const logsDir = resolveLogsPath(logging.logsPath, rootDir);
  const appFile = createDailyLogFile({
    logsDir,
    baseName: APP_LOG_BASE_NAME,
    retentionDays: logging.retentionDays,
  });
  const errorFile = createDailyLogFile({
    logsDir,
    baseName: ERROR_LOG_BASE_NAME,
    retentionDays: logging.retentionDays,
  });

  const stdout = logging.pretty
    ? pinoPretty({
        singleLine: true,
        colorize: true,
        translateTime: 'SYS:standard',
      })
    : pino.destination({ dest: 1, sync: false });

  return {
    stream: pino.multistream([
      { level: 'trace', stream: stdout },
      { level: 'trace', stream: appFile },
      { level: 'error', stream: errorFile },
    ]),
    close: () => {
      appFile.close();
      errorFile.close();
    },
  };
};

export const buildPinoHttpOptions = (logging: LoggingConfig) => ({
  level: logging.level,

  redact: {
    paths: logging.redactPaths,
    censor: '[REDACTED]',
  },

  genReqId: (request: { headers: Record<string, unknown> }) =>
    resolveRequestId(request.headers['x-request-id']),

  customProps: (request: { id: unknown }) => ({
    requestId: request.id,
  }),

  autoLogging: true,
});

export const loggingModule = LoggerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const logging = configService.getOrThrow<LoggingConfig>('logging');
    const destinations = createLogDestinations(logging);

    return {
      pinoHttp: [buildPinoHttpOptions(logging), destinations.stream],
    };
  },
});
