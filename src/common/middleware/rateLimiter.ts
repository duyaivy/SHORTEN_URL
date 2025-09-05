import type { Request, Response } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

import { env } from "@/common/utils/envConfig";

const rateLimiter = rateLimit({
	legacyHeaders: true,
	limit: env.COMMON_RATE_LIMIT_MAX_REQUESTS,
	message: "Too many requests, please try again later.",
	standardHeaders: true,
	windowMs: 15 * 60 * env.COMMON_RATE_LIMIT_WINDOW_MS,
	keyGenerator: (req: Request, _res: Response) => {
		const apiKey = req.header("x-api-key");
		if (apiKey) return `k:${apiKey}`;

		return ipKeyGenerator(req.ip as string);
	},
});

export default rateLimiter;
