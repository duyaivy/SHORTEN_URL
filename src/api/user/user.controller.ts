import type { Request, RequestHandler, Response } from "express";
import { MESSAGE } from "@/common/constant/message.const";
import { ServiceResponse } from "@/common/models/serviceResponse";
import type { TokenPayLoad } from "@/common/types/jwt.type";
import { userService } from "./user.service";

class UserController {
	getMe: RequestHandler = async (req: Request, res: Response) => {
		const userId = (req.decode_token_payload as TokenPayLoad).userId as string;
		const data = await userService.findById(userId);
		res.send(ServiceResponse.success(MESSAGE.GET_ME_SUCCESS, data));
	};
}

export const userController = new UserController();
