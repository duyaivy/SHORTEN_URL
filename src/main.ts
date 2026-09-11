import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import { EnvironmentVariables } from './shared/config/env.validation';
import cookieParser from 'cookie-parser';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService<EnvironmentVariables, true>);
  app.use(cookieParser());
  app.enableCors({
    origin: [configService.get('CLIENT_URL', { infer: true }) || true],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  const logger = app.get(Logger);
  app.useLogger(logger);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY
    }),

  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Shorten URL API')
    .setDescription('API documentation for the Shorten URL service')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT access token (without "Bearer" prefix)',
      },
      'access-token',
    )
    .addCookieAuth('access_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'access_token',
    }, 'access-token-cookie')
    .addCookieAuth('refresh_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'refresh_token',
    }, 'refresh-token-cookie')
    .addTag('Auth', 'User authentication (register, login, OAuth, refresh token, password reset)')
    .addTag('Short URL', 'Create, update, delete and manage short URLs')
    .addTag('QR History', 'Manage QR code scan history')
    .addTag('reCAPTCHA', 'reCAPTCHA verification')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
    customSiteTitle: 'Shorten URL API Docs',
  });

  const port = configService.get<number>('PORT', 8080);

  await app.listen(port);
  logger.log(`Application running on port ${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/docs`);
}

bootstrap();
