import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { loggingConfig } from './config/logging.config';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { DatabaseModule } from './infrastructure/database/database.module';

import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import authConfig from './config/auth.config';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    loggingConfig,

    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, authConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60_000,
          limit: 5,
        },
      ],
    }),

    PrismaModule,
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
