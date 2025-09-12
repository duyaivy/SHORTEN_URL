import z from "zod";
import { URL_MESSAGES } from "@/common/constant/message.const";
import { commonValidations } from "@/common/utils/commonValidation";

export const createShortUrlSchema = z.object({
	body: z.object({
		url: z.string().url(URL_MESSAGES.INVALID_URL),
		alias: z.string().min(3).max(30),
		password: commonValidations.password.optional(),
	}),
});
export const getShortUrlSchema = z.object({
	body: z.object({
		password: commonValidations.password,
	}),
	params: z.object({ alias: z.string().min(3).max(30) }),
});
