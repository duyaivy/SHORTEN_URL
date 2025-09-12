import { Router } from "express";
import { validateRequest, wrapRequestHandler } from "@/common/utils/httpHandlers";
import { AccessTokenValidation, isLoggedInValidator } from "../auth/auth.validation";
import { urlController } from "./url.controller";
import { createShortUrlSchema, getShortUrlSchema } from "./url.validation";

const urlRouter = Router();

/**
 * create short url
 * POST /
 * body: { url: string, alias: string, password: string }
 */
urlRouter.post(
	"/",
	validateRequest(createShortUrlSchema),
	isLoggedInValidator(AccessTokenValidation),
	wrapRequestHandler(urlController.createShortUrl),
);
/**
 * get url
 * GET /
 * params: { alias: string }
 */
urlRouter.get("/:alias", wrapRequestHandler(urlController.getShortUrl));
/**
 * get url has password
 * POST /
 * params: { alias: string }
 */
urlRouter.post(
	"/:alias",
	validateRequest(getShortUrlSchema),
	wrapRequestHandler(urlController.getShortUrlWithPassword),
);

export { urlRouter };
