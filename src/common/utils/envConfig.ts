import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  HOST: z.string().min(1).default("localhost"),
  PORT: z.coerce.number().int().positive().default(8080),
  CORS_ORIGIN: z.string().url().default("http://localhost:8080"),
  CORS_ORIGIN_PUBLIC: z.string().url(),
  COMMON_RATE_LIMIT_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .positive()
    .default(1000),
  COMMON_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(1000),
  DB_CONNECTION_STRING: z.string().url().min(1),
  DB_NAME: z.string().min(1).default("Shorten_URL"),
  DB_USER_COLLECTION: z.string().min(1).default("users"),
  DB_REFRESH_TOKEN_COLLECTION: z.string().min(1).default("refresh_tokens"),
  SECRET_OR_PUBLIC_JWT_KEY: z.string().min(1).default("your-secret-key"),
  EXP_TIME: z.string().min(1).default("1h"),
  ACCESS_TOKEN_EXPIRATION_TIME: z.string().min(1).default("15m"),
  REFRESH_TOKEN_EXPIRATION_TIME: z.string().min(1).default("7d"),
  ALGORITHM_JWT: z.enum(["HS256", "HS384", "HS512"]).default("HS256"),
  PRIVATE_ACCESS_TOKEN_KEY: z
    .string()
    .min(1)
    .default("your-private-access-token-key"),
  PRIVATE_REFRESH_TOKEN_KEY: z
    .string()
    .min(1)
    .default("your-private-refresh-token-key"),
  EMAIL_HOST: z.string().min(1).default("smtp.gmail.com"),
  EMAIL_PORT: z.coerce.number().int().positive(),
  EMAIL_USER: z.string().min(1).email().default("your-email@example.com"),
  EMAIL_PASSWORD: z.string().min(1).default("your-email-password"),
  CLIENT_URL: z.string().url().min(1).default("http://localhost:3000"),
  PRIVATE_PASSWORD: z.string().min(1).default("your-private-password"),
  GOOGLE_CLIENT_ID: z.string().min(1).default("your-google-client-id"),
  GOOGLE_CLIENT_SECRET: z.string().min(1).default("your-google-client-secret"),
  GOOGLE_REDIRECT_URI: z
    .string()
    .url()
    .min(1)
    .default("http://localhost:8080/api/v1/auth/google/callback"),
  DB_URL_COLLECTION: z.string().min(1).default("urls"),
  AWS_REGION: z.string().min(1).default("your-aws-region"),
  AWS_ACCESS_KEY_ID: z.string().min(1).default("your-aws-access-key-id"),
  AWS_SECRET_ACCESS_KEY: z
    .string()
    .min(1)
    .default("your-aws-secret-access-key"),
  AWS_BUCKET_NAME: z.string().min(1).default("your-aws-bucket-name"),
  CLIENT_SHORT_LINK: z.string().url().min(1).default("http://localhost:3000"),
  DB_QR_HISTORY_COLLECTION: z.string().min(1).default("qr_histories"),
  SECRECT_KEY_RECAPCHA: z.string().min(1).default("your-recaptcha-secret-key"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.format());
  throw new Error("Invalid environment variables");
}

export const env = {
  ...parsedEnv.data,
  isDevelopment: parsedEnv.data.NODE_ENV === "development",
  isProduction: parsedEnv.data.NODE_ENV === "production",
  isTest: parsedEnv.data.NODE_ENV === "test",
};
