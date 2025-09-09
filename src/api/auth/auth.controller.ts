import type { NextFunction, Request, Response } from "express";
import { AUTH_MESSAGES } from "@/common/constant/message.const";
import { ServiceResponse } from "@/common/models/serviceResponse";
import type { RegisterRequest, ResetPasswordRequest } from "@/common/models/user.model";
import type { TokenPayLoad } from "@/common/types/jwt.type";
import { authService } from "./auth.service";

class AuthController {
	register = async (req: Request, res: Response, _next: NextFunction) => {
		const returnData = await authService.register(req.body as RegisterRequest);
		res.send(ServiceResponse.success(AUTH_MESSAGES.REGISTER_SUCCESS, returnData));
	};

	login = async (req: Request, res: Response, _next: NextFunction) => {
		const returnData = await authService.login(req.body as RegisterRequest);
		res.send(ServiceResponse.success(AUTH_MESSAGES.LOGIN_SUCCESS, returnData));
	};

	refreshToken = async (req: Request, res: Response, _next: NextFunction) => {
		const data = await authService.refreshToken({
			payload: req.decode_token_payload as TokenPayLoad,
			token: req.body.refresh_token,
		});
		res.send(ServiceResponse.success(AUTH_MESSAGES.REFRESH_TOKEN_SUCCESS, data));
	};
	forgotPassword = async (req: Request<any, any, any, { email: string }>, res: Response, _next: NextFunction) => {
		await authService.forgotPassword(req.query?.email);
		res.send(ServiceResponse.success(AUTH_MESSAGES.FORGOT_PASSWORD_SUCCESS, null));
	};
	resetPassword = async (req: Request<any, any, ResetPasswordRequest>, res: Response, _next: NextFunction) => {
		await authService.resetPassword(req.body);
		res.send(ServiceResponse.success(AUTH_MESSAGES.RESET_PASSWORD_SUCCESS, null));
	};
}
export const authController = new AuthController();
