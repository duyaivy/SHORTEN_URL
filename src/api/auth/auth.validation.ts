import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import z from "zod";
import { MESSAGE } from "@/common/constant/message.const";
import type { RefreshTokenRequest } from "@/common/models/refreshToken.model";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { commonValidations } from "@/common/utils/commonValidation";
import { authService } from "./auth.service";

export const RegisterSchema = z.object({
	body: z.object({
		email: commonValidations.email,
		password: commonValidations.password,
	}),
});
export const LoginSchema = RegisterSchema;
export const ForgotPasswordSchema = z.object({
	query: z.object({
		email: commonValidations.email,
	}),
});
export const ResetPasswordSchema = z.object({
	body: z.object({
		password: commonValidations.password,
		token: z.string().min(1, MESSAGE.TOKEN_REQUIRED),
	}),
});
export const RefreshTokenSchema = z.object({
	body: z.object({
		refresh_token: z.string().min(1, MESSAGE.REFRESH_TOKEN_REQUIRED),
	}),
});
export const AccessTokenValidation = async (req: Request, _res: Response, next: NextFunction) => {
	// Bearer <token>
	const access_token = req.headers["authorization"]?.split(" ")[1];
	if (!access_token) {
		next(ServiceResponse.failure(MESSAGE.ACCESS_TOKEN_REQUIRED, null, StatusCodes.UNAUTHORIZED));
	}
	const jwtPayload = await authService.verifyAccessToken(access_token as string);
	req.decode_token_payload = jwtPayload;
	next();
};
export const RefreshTokenValidation = async (
	req: Request<any, any, RefreshTokenRequest>,
	_res: Response,
	next: NextFunction,
) => {
	const refresh_token = req.body.refresh_token;
	const jwtPayload = await authService.verifyRefreshToken(refresh_token);
	req.decode_token_payload = jwtPayload;
	next();
};

export const isLoggedInValidator = (
	middleWares: (request: Request, response: Response, nextFunction: NextFunction) => void,
) => {
	return (req: Request, res: Response, next: NextFunction) => {
		// neu co thi chay
		if (req.headers.authorization) {
			return middleWares(req, res, next);
		}
		next();
	};
};
