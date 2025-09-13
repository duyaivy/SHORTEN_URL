import { Router } from "express";
import { wrapRequestHandler } from "@/common/utils/httpHandlers";
import { AccessTokenValidation } from "../auth/auth.validation";
import { userController } from "./user.controller";

const userRouter: Router = Router();

/**
 *
 * get-me
 * GET /user/get-me
 * params: { email: string }
 */
userRouter.get("/get-me", AccessTokenValidation, wrapRequestHandler(userController.getMe));

export { userRouter };
