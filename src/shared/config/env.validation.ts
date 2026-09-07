import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 8080;

  @IsString()
  @IsOptional()
  HOST: string = 'localhost';

  // CORS & Client
  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  @IsString()
  @IsOptional()
  CORS_ORIGIN_PUBLIC?: string;

  @IsString()
  @IsOptional()
  CLIENT_SHORT_LINK?: string;

  // Rate Limiting
  @IsNumber()
  @IsOptional()
  COMMON_RATE_LIMIT_WINDOW_MS: number = 1000;

  @IsNumber()
  @IsOptional()
  COMMON_RATE_LIMIT_MAX_REQUESTS: number = 100;

  // Database
  @IsString()
  @IsOptional()
  MONGODB_URI?: string;

  @IsString()
  @IsOptional()
  DATABASE_URL: string = 'mongodb://localhost:27017/Shorten_Link';

  @IsString()
  @IsOptional()
  DB_USER_COLLECTION: string = 'users';

  @IsString()
  @IsOptional()
  DB_REFRESH_TOKEN_COLLECTION: string = 'refresh_tokens';

  @IsString()
  @IsOptional()
  DB_URL_COLLECTION: string = 'urls';

  @IsString()
  @IsOptional()
  DB_QR_HISTORY_COLLECTION: string = 'qr_histories';

  // JWT & Security
  @IsString()
  @IsOptional()
  PRIVATE_ACCESS_TOKEN_KEY?: string;

  @IsString()
  @IsOptional()
  PRIVATE_REFRESH_TOKEN_KEY?: string;

  @IsString()
  @IsOptional()
  ALGORITHM_JWT: string = 'HS256';

  @IsString()
  @IsOptional()
  ACCESS_TOKEN_EXPIRATION_TIME: string = '1h';

  @IsString()
  @IsOptional()
  REFRESH_TOKEN_EXPIRATION_TIME: string = '3d';

  @IsString()
  @IsOptional()
  SECRET_OR_PUBLIC_JWT_KEY?: string;

  @IsString()
  @IsOptional()
  PRIVATE_PASSWORD?: string;

  // Email Configuration (SMTP)
  @IsNumber()
  @IsOptional()
  EMAIL_PORT: number = 587;

  @IsString()
  @IsOptional()
  CLIENT_URL?: string;

  @IsString()
  @IsOptional()
  EMAIL_USER?: string;

  @IsString()
  @IsOptional()
  EMAIL_PASSWORD?: string;

  // AWS S3
  @IsString()
  @IsOptional()
  AWS_REGION?: string;

  @IsString()
  @IsOptional()
  AWS_BUCKET_NAME?: string;

  @IsString()
  @IsOptional()
  AWS_ACCESS_KEY_ID?: string;

  @IsString()
  @IsOptional()
  AWS_SECRET_ACCESS_KEY?: string;

  // Google OAuth2
  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  GOOGLE_REDIRECT_URI?: string;

  // Google reCAPTCHA
  @IsString()
  @IsOptional()
  SECRECT_KEY_RECAPCHA?: string;

  @IsString()
  @IsOptional()
  PASSWORD_SECRET?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Config validation error: ${errors.toString()}`);
  }

  return validatedConfig;
}
