import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppConfigModule } from './shared/config/config.module';
import { PrismaModule } from './shared/services/prisma.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
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
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    AuthModule
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }

