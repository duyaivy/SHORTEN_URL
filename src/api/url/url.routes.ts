import { Router } from "express";
import { validateRequest, wrapRequestHandler } from "@/common/utils/httpHandlers";
import { AccessTokenValidation, isLoggedInValidator } from "../auth/auth.validation";
import { urlController } from "./url.controller";
import {
	createShortUrlSchema,
	deleteURLsSchema,
	getShortUrlSchema,
	paginationSchema,
	updateUrlActiveSchema,
	updateUrlSchema,
} from "./url.validation";

const urlRouter: Router = Router();

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
 * get url has password
 * POST /
 * params: { alias: string }
 */
urlRouter.post(
	"/:alias",
	validateRequest(getShortUrlSchema),
	wrapRequestHandler(urlController.getShortUrlWithPassword),
);
/**
 * get url has password
 * POST /
 * params: { alias: string }
 */
urlRouter.delete(
	"/my-urls",
	validateRequest(deleteURLsSchema),
	AccessTokenValidation,
	wrapRequestHandler(urlController.deleteURLs),
);
/**
 * update URL
 * PATCH /
 * body: { alias: string }
 */
urlRouter.patch(
	"/my-urls/active",
	validateRequest(updateUrlActiveSchema),
	AccessTokenValidation,
	wrapRequestHandler(urlController.updateUrlActive),
);
/**
 * get my URLs
 * GET /
 * query: { limit: number, page: number }
 */
urlRouter.get(
	"/my-urls",
	validateRequest(paginationSchema),
	AccessTokenValidation,
	wrapRequestHandler(urlController.getMyURLs),
);
/**
 * update URL
 * PATCH
 * body: { alias: string, url?: string, password?: string, is_active?: boolean }
 */
urlRouter.patch(
	"/:alias",
	validateRequest(updateUrlSchema),
	AccessTokenValidation,
	wrapRequestHandler(urlController.updateUrl),
);
/**
 * get url
 * GET /
 * params: { alias: string }
 */
urlRouter.get("/:alias", wrapRequestHandler(urlController.getShortUrl));
export { urlRouter };
