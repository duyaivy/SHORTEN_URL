import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { URL_MESSAGES } from "@/common/constant/message.const";
import { ServiceResponse } from "@/common/models/serviceResponse";
import type { TokenPayLoad } from "@/common/types/jwt.type";
import type { CreateShortUrlRequest } from "./url.model";
import { urlService } from "./url.service";

class UrlController {
	createShortUrl = async (req: Request<any, any, CreateShortUrlRequest>, res: Response, _next: NextFunction) => {
		const userId = (req.decode_token_payload as TokenPayLoad)?.userId;
		const data = await urlService.createShortUrl(req.body, userId);
		res.send(ServiceResponse.success(URL_MESSAGES.CREATE_SHORT_URL_SUCCESS, data));
	};
	getShortUrl = async (req: Request<{ alias: string }>, res: Response, _next: NextFunction) => {
		const { alias } = req.params;
		const url = await urlService.getShortUrl(alias);
		res.redirect(StatusCodes.MOVED_PERMANENTLY, url);
	};
	getShortUrlWithPassword = async (
		req: Request<{ alias: string }, any, { password: string }>,
		res: Response,
		_next: NextFunction,
	) => {
		const { alias } = req.params;
		const { password } = req.body;
		const url = await urlService.getShortUrlWithPassword(alias, password);
		res.redirect(StatusCodes.MOVED_PERMANENTLY, url);
	};
}

export const urlController = new UrlController();
