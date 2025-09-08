import { StatusCodes } from "http-status-codes";
import { z } from "zod";

export class ServiceResponse<T = null> {
	readonly statusCode: number;
	readonly success: boolean;
	readonly message: string;
	readonly data: T;

	private constructor(success: boolean, message: string, data: T, statusCode: number) {
		this.statusCode = statusCode;
		this.success = success;
		this.message = message;
		this.data = data;
	}

	static success<T>(message: string, data: T, statusCode: number = StatusCodes.OK) {
		return new ServiceResponse(true, message, data, statusCode);
	}

	static failure<T>(message: string, data: T, statusCode: number = StatusCodes.BAD_REQUEST) {
		return new ServiceResponse(false, message, data, statusCode);
	}
}

export const ServiceResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
	z.object({
		success: z.boolean(),
		statusCode: z.number(),
		message: z.string(),
		data: dataSchema.optional(),
	});
