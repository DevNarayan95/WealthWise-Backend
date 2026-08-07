import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { loggingConfig } from './config/logging.config';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { DatabaseModule } from './infrastructure/database/database.module';

import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    loggingConfig,

    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    PrismaModule,
    DatabaseModule,
    HealthModule,
    UsersModule,
  ],
})
export class AppModule {}
