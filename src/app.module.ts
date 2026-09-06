import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigModule } from './shared/config/config.module.js';

@Module({
  imports: [
    AppConfigModule,
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
                  },
                }
              : undefined,
            level: isDev ? 'debug' : 'info',
          },
        };
      },
    }),
    MongooseModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const explicitUri = configService.get<string>('MONGODB_URI');
        if (explicitUri) {
          return { uri: explicitUri };
        }
        const connStr = configService.get<string>('DB_CONNECTION_STRING', 'mongodb://localhost:27017/');
        const dbName = configService.get<string>('DB_NAME', 'Shorten_URL');
        const cleanConnStr = connStr.endsWith('/') ? connStr : `${connStr}/`;
        return {
          uri: `${cleanConnStr}${dbName}`,
        };
      },
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
