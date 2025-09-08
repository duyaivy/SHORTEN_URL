import type { ErrorRequestHandler, RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { MESSAGE } from "../constant/message.const";

export const unexpectedRequest: RequestHandler = (_req, res) => {
	res.status(StatusCodes.NOT_FOUND).json({
		statusCode: StatusCodes.NOT_FOUND,
		message: MESSAGE.NOT_FOUND,
		success: false,
		data: null,
	});
};

export const addErrorToRequestLog: ErrorRequestHandler = (err, _req, res, next) => {
	res.locals.err = err;
	next(err);
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
	const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
	const message = err.message || MESSAGE.INTERNAL_SERVER_ERROR;

	res.status(statusCode).json({
		statusCode,
		message,
		success: false,
		data: null,
	});
};
