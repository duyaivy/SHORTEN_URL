import z from "zod";
import { commonValidations } from "@/common/utils/commonValidation";

export const RegisterSchema = z.object({
	body: z.object({
		email: commonValidations.email,
		password: commonValidations.password,
	}),
});
export const LoginSchema = z.object({
	body: z.object({
		email: commonValidations.email,
		password: commonValidations.password,
	}),
});
