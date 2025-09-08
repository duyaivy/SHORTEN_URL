import { Router } from "express";
import { validateRequest, wrapRequestHandler } from "@/common/utils/httpHandlers";
import { authController } from "./auth.controller";
import { LoginSchema, RefreshTokenValidation, RegisterSchema } from "./auth.validation";

const authRouter = Router();

/**
 *
 * register
 * POST /auth/register
 * body: { email: string, password: string }
 */
authRouter.post("/register", validateRequest(RegisterSchema), wrapRequestHandler(authController.register));

/**
 *
 * login
 * POST /auth/login
 * body: { email: string, password: string }
 */
authRouter.post("/login", validateRequest(LoginSchema), wrapRequestHandler(authController.login));

/**
 *
 * refresh-token
 * POST /auth/refresh-token
 * body: { refresh_token: string }
 */
authRouter.post("/refresh-token", RefreshTokenValidation, wrapRequestHandler(authController.refreshToken));

export { authRouter };
