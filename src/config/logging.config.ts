import crypto from 'node:crypto';
import { LoggerModule } from 'nestjs-pino';

export const loggingConfig = LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? 'info',

    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              colorize: true,
              translateTime: 'SYS:standard',
            },
          }
        : undefined,

    genReqId: (request) => {
      const existingRequestId = request.headers['x-request-id'];

      if (typeof existingRequestId === 'string') {
        return existingRequestId;
      }

      return crypto.randomUUID();
    },

    customProps: (request) => ({
      requestId: request.id,
    }),

    autoLogging: true,
  },
});
