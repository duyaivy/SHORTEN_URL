import type { NextFunction, Request, Response } from "express";
import { ServiceResponse } from "@/common/models/serviceResponse";
import type { RegisterRequest } from "@/common/models/user.model";
import type { TokenPayLoad } from "@/common/types/jwt.type";
import { authService } from "./auth.service";

class AuthController {
	register = async (req: Request, res: Response, _next: NextFunction) => {
		const returnData = await authService.register(req.body as RegisterRequest);
		res.send(ServiceResponse.success("Register successfully", returnData));
	};

	login = async (req: Request, res: Response, _next: NextFunction) => {
		const returnData = await authService.login(req.body as RegisterRequest);
		res.send(ServiceResponse.success("Login successfully", returnData));
	};

	refreshToken = async (req: Request, res: Response, _next: NextFunction) => {
		const data = await authService.refreshToken({
			payload: req.decode_token_payload as TokenPayLoad,
			token: req.body.refresh_token,
		});
		res.send(ServiceResponse.success("Refresh token successfully", data));
	};
}
export const authController = new AuthController();
