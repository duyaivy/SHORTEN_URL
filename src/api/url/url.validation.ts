import z from "zod";
import { MESSAGE, URL_MESSAGES } from "@/common/constant/message.const";
import { commonValidations, ObjectIdSchema } from "@/common/utils/commonValidation";

export const createShortUrlSchema = z.object({
	body: z.object({
		url: z.string().url(URL_MESSAGES.INVALID_URL),
		alias: z.string().min(3).max(30),
		password: commonValidations.password.optional(),
	}),
});
export const createQrHistorySchema = z.object({
	body: z.object({
		encode: z.string().url(URL_MESSAGES.INVALID_URL),
	}),
});
export const getShortUrlSchema = z.object({
	body: z.object({
		password: z.string().min(3).max(30).optional(),
	}),
	params: z.object({ alias: z.string().min(3).max(30) }),
});
export const deleteURLsSchema = z.object({
	body: z.object({
		ids: z.array(ObjectIdSchema),
	}),
});
export const updateUrlSchema = z.object({
	body: z.object({
		is_active: z.boolean({ message: MESSAGE.IS_BOOLEAN }).optional(),
		url: z.string().url(URL_MESSAGES.INVALID_URL).optional(),
		alias: z.string().min(3).max(30).optional(),
		password: commonValidations.password.optional(),
	}),
});
export const updateUrlActiveSchema = z.object({
	body: z.object({
		urls: z.array(
			z.object({
				_id: commonValidations.id,
				is_active: z.boolean({ message: MESSAGE.IS_BOOLEAN }),
			}),
		),
	}),
});
export const paginationSchema = z.object({
	query: z.object({
		limit: z.coerce.number().int().min(1, MESSAGE.LIMIT_MIN).max(100, MESSAGE.LIMIT_MAX).optional(),
		page: z.coerce.number().int().min(1, MESSAGE.LIMIT_MIN).optional(),
	}),
});
