import { z } from "zod";
import { MESSAGE } from "../constant/message.const";

export const ObjectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, MESSAGE.INVALID_ID);
export const commonValidations = {
	id: ObjectIdSchema,
	email: z.string().email(MESSAGE.INVALID_EMAIL),
	password: z
		.string()
		.min(6, MESSAGE.INVALID_PASSWORD)
		.max(100, MESSAGE.INVALID_PASSWORD)
		.regex(/^(?=.*[0-9])(?=.*[!@#$%^&*])/, MESSAGE.INVALID_PASSWORD),
	username: z.string().min(3, MESSAGE.USERNAME_REQUIRED).max(50, MESSAGE.USERNAME_MAX_LENGTH),
};
