import { Router } from "express";
import { validateRequest } from "@/common/utils/httpHandlers";
import { authController } from "./auth.controller";
import { RegisterSchema } from "./auth.validation";

const authRouter = Router();

/**
 *
 * register
 * POST /auth/register
 * body: { username: string, password: string }
 */
authRouter.post("/register", validateRequest(RegisterSchema), authController.register);

/**
 *
 * login
 * POST /auth/login
 * body: { username: string, password: string }
 */
authRouter.post("/login", validateRequest(RegisterSchema), authController.login);

/**
 *
 * refresh-token
 * POST /auth/refresh-token
 * body: { refresh_token: string }
 */
authRouter.post("/refresh-token", authController.refreshToken);

export { authRouter };
