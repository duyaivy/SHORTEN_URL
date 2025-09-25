import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { URL_MESSAGES } from "@/common/constant/message.const";
import type { PaginationRequest } from "@/common/models/common.model";
import { ServiceResponse } from "@/common/models/serviceResponse";
import type { TokenPayLoad } from "@/common/types/jwt.type";
import type {
	CreateShortUrlRequest,
	DeleteURLsRequest,
	GetURLPasswordRequest,
	UpdateUrlRequest,
	URLMini,
} from "./url.model";
import { urlService } from "./url.service";

// import { paginationSchema } from "./url.validation";

class UrlController {
	createShortUrl = async (req: Request<any, any, CreateShortUrlRequest>, res: Response, _next: NextFunction) => {
		const userId = (req.decode_token_payload as TokenPayLoad)?.userId;
		const data = await urlService.createShortUrl(req.body, userId);
		res.send(ServiceResponse.success(URL_MESSAGES.CREATE_SHORT_URL_SUCCESS, data));
	};
	getShortUrl = async (req: Request<{ alias: string }>, res: Response, _next: NextFunction) => {
		const { alias } = req.params;
		const url = await urlService.getShortUrl(alias);
		res.send(ServiceResponse.success(URL_MESSAGES.GET_SHORT_URL_SUCCESS, url));
	};
	getShortUrlSEO = async (req: Request<{ alias: string }>, res: Response, _next: NextFunction) => {
		const { alias } = req.params;
		const url = await urlService.getShortUrl(alias);
		res.redirect(StatusCodes.MOVED_PERMANENTLY, url.url);
	};
	getShortUrlWithPassword = async (
		req: Request<Pick<GetURLPasswordRequest, "alias">, any, Pick<GetURLPasswordRequest, "password">>,
		res: Response,
		_next: NextFunction,
	) => {
		const { alias } = req.params;
		const { password } = req.body;
		const url = await urlService.getShortUrlWithPassword(alias, password);
		res.send(ServiceResponse.success(URL_MESSAGES.GET_SHORT_URL_SUCCESS, url));
	};
	deleteURLs = async (req: Request<any, any, DeleteURLsRequest>, res: Response, _next: NextFunction) => {
		const userId = (req.decode_token_payload as TokenPayLoad)?.userId;
		const { ids } = req.body;
		await urlService.deleteURLs({ ids, userId });
		res.send(ServiceResponse.success(URL_MESSAGES.DELETE_URLS_SUCCESS, null));
	};
	updateUrl = async (req: Request<{ alias: string }, any, UpdateUrlRequest>, res: Response, _next: NextFunction) => {
		const userId = (req.decode_token_payload as TokenPayLoad)?.userId;
		const { alias } = req.params;
		const data = await urlService.updateUrl(alias, req.body, userId);
		res.send(ServiceResponse.success(URL_MESSAGES.UPDATE_URL_SUCCESS, data));
	};
	updateUrlActive = async (
		req: Request<{ alias: string }, any, { urls: URLMini[] }>,
		res: Response,
		_next: NextFunction,
	) => {
		const userId = (req.decode_token_payload as TokenPayLoad)?.userId;
		const { urls } = req.body;
		const data = await urlService.updateUrlActive(urls, userId);
		res.send(ServiceResponse.success(URL_MESSAGES.UPDATE_URL_SUCCESS, data));
	};
	getMyURLs = async (req: Request<any, any, any, PaginationRequest>, res: Response, _next: NextFunction) => {
		const userId = (req.decode_token_payload as TokenPayLoad)?.userId;
		const { limit, page } = req.query;
		const data = await urlService.getMyURLs({ limit, page }, userId);
		res.send(ServiceResponse.success(URL_MESSAGES.UPDATE_URL_SUCCESS, data));
	};
	createQrHistory = async (req: Request<any, any, { encoded: string }>, res: Response, _next: NextFunction) => {
		const userId = (req.decode_token_payload as TokenPayLoad)?.userId;
		const { encoded } = req.body;
		await urlService.createQrHistory({ owner_id: userId, encoded });
		res.send(ServiceResponse.success(URL_MESSAGES.CREATE_QR_HISTORY_SUCCESS, null));
	};
	getMyQrHistories = async (req: Request<any, any, any, PaginationRequest>, res: Response, _next: NextFunction) => {
		const userId = (req.decode_token_payload as TokenPayLoad)?.userId;
		const { limit, page } = req.query;
		const data = await urlService.getMyQrHistories({ limit, page }, userId);
		res.send(ServiceResponse.success(URL_MESSAGES.GET_QR_HISTORIES_SUCCESS, data));
	};
}

export const urlController = new UrlController();
