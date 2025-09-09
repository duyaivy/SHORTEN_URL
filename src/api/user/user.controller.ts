import type { Request, RequestHandler, Response } from "express";
import type { TokenPayLoad } from "@/common/types/jwt.type";
import { userService } from "./user.service";

class UserController {
	getMe: RequestHandler = async (req: Request, res: Response) => {
		const userId = (req.decode_token_payload as TokenPayLoad).userId as string;
		const data = await userService.findById(userId);
		res.send(data);
	};
}

export const userController = new UserController();
