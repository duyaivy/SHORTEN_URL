import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppConfigModule } from './shared/config/config.module';
import { PrismaModule } from './shared/services/prisma.module';
import { RedisModule } from './shared/services/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { ShortUrlModule } from './modules/short-url/short-url.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,

    // Global Redis module (cache + analytics INCR counters)
    RedisModule,

    // Scheduler for analytics flush (every 30s)
    ScheduleModule.forRoot(),

    // Pino Logger
    LoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isDev = configService.get<string>('NODE_ENV') !== 'production';
        return {
          pinoHttp: {
            transport: isDev
              ? {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                    translateTime: 'HH:MM:ss',
                    ignore: 'pid,hostname,req.headers,req.remoteAddress,req.remotePort,res.headers',
                    messageFormat: '{context} {msg}',
                  },
                }
              : undefined,
            level: isDev ? 'debug' : 'info',
            customSuccessMessage: (req: any, res: any, responseTime: number) =>
              `[${req.method}] ${req.url} → ${res.statusCode} (${responseTime}ms)`,
            customErrorMessage: (req: any, res: any, err: any) =>
              `[${req.method}] ${req.url} → ${res.statusCode} - ${err.message}`,
            serializers: {
              req: (req: any) => ({
                method: req.method,
                url: req.url,
                query: req.query,
              }),
              res: (res: any) => ({
                statusCode: res.statusCode,
              }),
            },
          },
        };
      },
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60000, limit: 60 },
      { name: 'create', ttl: 60000, limit: 10 },
    ]),

    AuthModule,
    ShortUrlModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
