import crypto from 'node:crypto';
import path from 'node:path';

import { ConfigService } from '@nestjs/config';
import pino, { type DestinationStream } from 'pino';
import pinoPretty from 'pino-pretty';
import pinoRoll, { type PinoRollLimit } from 'pino-roll';
import { LoggerModule } from 'nestjs-pino';

import type { AppConfig } from './app-config';

type LoggingConfig = AppConfig['logging'];

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;
const APP_LOG_BASE_NAME = 'app';
const ERROR_LOG_BASE_NAME = 'error';
const LOG_DATE_FORMAT = 'yyyy-MM-dd';

export interface LogDestinations {
  stream: DestinationStream;
  close: () => void;
}

export const resolveLogsPath = (
  logsPath: string,
  rootDir: string = process.cwd(),
): string => path.resolve(rootDir, logsPath);

// pino-roll's `count` is the number of retained files besides the active one, and cleanup runs at each daily roll.
// So retentionDays previous daily files are kept, plus today's file.
export const buildRollLimit = (retentionDays: number): PinoRollLimit => ({
  count: retentionDays,
  removeOtherLogFiles: true,
});

export const resolveRequestId = (value: unknown): string =>
  typeof value === 'string' && REQUEST_ID_PATTERN.test(value)
    ? value
    : crypto.randomUUID();

const createRollingFile = (
  logsDir: string,
  baseName: string,
  retentionDays: number,
) =>
  pinoRoll({
    file: path.join(logsDir, baseName),
    frequency: 'daily',
    dateFormat: LOG_DATE_FORMAT,
    mkdir: true,
    sync: true,
    limit: buildRollLimit(retentionDays),
  });

export const createLogDestinations = async (
  logging: LoggingConfig,
  rootDir?: string,
): Promise<LogDestinations> => {
  const logsDir = resolveLogsPath(logging.logsPath, rootDir);
  const appFile = await createRollingFile(
    logsDir,
    APP_LOG_BASE_NAME,
    logging.retentionDays,
  );
  const errorFile = await createRollingFile(
    logsDir,
    ERROR_LOG_BASE_NAME,
    logging.retentionDays,
  );

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
      appFile.end();
      errorFile.end();
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
  useFactory: async (configService: ConfigService) => {
    const logging = configService.getOrThrow<LoggingConfig>('logging');
    const destinations = await createLogDestinations(logging);

    return {
      pinoHttp: [buildPinoHttpOptions(logging), destinations.stream],
    };
  },
});
