import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ZodError, ZodSchema } from "zod";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { MESSAGE } from "../constant/message.const";

export const validateRequest = (schema: ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
	try {
		await schema.parseAsync({ body: req.body, query: req.query, params: req.params });
		next();
	} catch (err) {
		// bat loi zod
		const errors = (err as ZodError).errors.map((e) => {
			const fieldPath = e.path.length > 0 ? e.path.join(".") : "root";
			return `${fieldPath}: ${e.message}`;
		});

		const errorMessage = MESSAGE.VALIDATION_ERROR;
		const errorData = errors.map((e) => {
			const fieldPath = e.split(":")[0];
			return {
				field: fieldPath,
				message: e.split(":")[1].trim(),
			};
		});

		const statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
		const serviceResponse = ServiceResponse.failure(errorMessage, errorData, statusCode);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	}
};

export const wrapRequestHandler = (fn: Function) => {
	return (req: Request, res: Response, next: NextFunction) => {
		// tra ve Promise, neu co loi se duoc bat
		Promise.resolve(fn(req, res, next)).catch(next);
	};
};
