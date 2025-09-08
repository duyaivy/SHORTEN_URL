import type { NextFunction, Request, Response } from "express";
import { ServiceResponse } from "@/common/models/serviceResponse";
import type { RegisterRequest } from "@/common/models/user.model";
import { authService } from "./auth.services";

class AuthController {
	register = async (req: Request<any, any, RegisterRequest>, res: Response, _next: NextFunction) => {
		const returnData = await authService.register(req.body);
		res.send(ServiceResponse.success("Register successfully", returnData));
	};
	login = async (req: Request<any, any, RegisterRequest>, res: Response, _next: NextFunction) => {
		const returnData = await authService.login(req.body);
		res.send(ServiceResponse.success("Login successfully", returnData));
	};
	refreshToken = async (req: Request<any, any, { refresh_token: string }>, res: Response, _next: NextFunction) => {
		const returnData = await authService.refreshToken(req.body);
		res.send(ServiceResponse.success("Refresh token successfully", returnData));
	};
}
export const authController = new AuthController();
