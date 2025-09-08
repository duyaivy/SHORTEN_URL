import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).default("production"),

	HOST: z.string().min(1).default("localhost"),

	PORT: z.coerce.number().int().positive().default(8080),

	CORS_ORIGIN: z.string().url().default("http://localhost:8080"),
	COMMON_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(1000),
	COMMON_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(1000),
	DB_CONNECTION_STRING: z.string().url().min(1),
	DB_NAME: z.string().min(1).default("Shorten_URL"),
	DB_USER_COLLECTION: z.string().min(1).default("users"),
	SECRET_OR_PUBLIC_JWT_KEY: z.string().min(1).default("your-secret-key"),
	EXP_TIME: z.string().min(1).default("1h"),
	ACCESS_TOKEN_EXPIRATION_TIME: z.string().min(1).default("15m"),
	REFRESH_TOKEN_EXPIRATION_TIME: z.string().min(1).default("7d"),
	ALGORITHM_JWT: z.enum(["HS256", "HS384", "HS512"]).default("HS256"),
	PRIVATE_ACCESS_TOKEN_KEY: z.string().min(1).default("your-private-access-token-key"),
	PRIVATE_REFRESH_TOKEN_KEY: z.string().min(1).default("your-private-refresh-token-key"),
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
