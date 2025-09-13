import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pino } from "pino";
import rateLimiter from "@/common/middleware/rateLimiter";
import requestLogger from "@/common/middleware/requestLogger";
import { env } from "@/common/utils/envConfig";
import { authRouter } from "./api/auth/auth.routes";
import { urlRouter } from "./api/url/url.routes";
import { userRouter } from "./api/user/user.routes";
import { addErrorToRequestLog, errorHandler } from "./common/middleware/errorHandler";
import databaseService from "./common/services/database.service";

const logger = pino({ name: "server start" });
const app: Express = express();

// Set the application to trust the reverse proxy
app.set("trust proxy", true);

// connect to database
databaseService.connect().then(() => {
	databaseService.indexUser();
	databaseService.indexURL();
});
// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(helmet());
app.use(rateLimiter);

// Request logging
app.use(requestLogger);

// Routes
app.use("/user", userRouter);
app.use("/auth", authRouter);
app.use("/", urlRouter);
// Error handlers
app.use(addErrorToRequestLog);
app.use(errorHandler);

export { app, logger };
