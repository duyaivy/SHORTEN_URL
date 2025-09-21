import { Router } from "express";
import { validateRequest, wrapRequestHandler } from "@/common/utils/httpHandlers";
import { authController } from "./auth.controller";
import {
	AccessTokenValidation,
	ForgotPasswordSchema,
	LoginSchema,
	RefreshTokenValidation,
	RegisterSchema,
	ResetPasswordSchema,
} from "./auth.validation";

const authRouter: Router = Router();

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
/**
 *
 * forgot-password
 * GET /auth/forgot-password
 * params: { email: string }
 */
authRouter.get(
	"/forgot-password",
	validateRequest(ForgotPasswordSchema),
	wrapRequestHandler(authController.forgotPassword),
);
/**
 * reset-password
 * POST /auth/reset-password
 * params: { email: string }
 */
authRouter.post(
	"/reset-password",
	validateRequest(ResetPasswordSchema),
	wrapRequestHandler(authController.resetPassword),
);
/**
 * reset-password
 * POST /auth/logout
 * params: { email: string }
 */
authRouter.delete("/logout", AccessTokenValidation, RefreshTokenValidation, wrapRequestHandler(authController.logout));
export { authRouter };
