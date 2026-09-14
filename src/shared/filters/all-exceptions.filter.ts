import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ServiceResponse } from '../responses/service-response';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let data: any = null;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const respObj = exceptionResponse as Record<string, any>;

        if (statusCode === HttpStatus.UNPROCESSABLE_ENTITY || statusCode === HttpStatus.BAD_REQUEST) {
          message = typeof respObj.message === 'string' && respObj.message !== 'Unprocessable Entity' && respObj.message !== 'Bad Request'
            ? respObj.message
            : 'Lỗi xác thực dữ liệu';

          if (Array.isArray(respObj.errors)) {
            data = respObj.errors;
          } else if (Array.isArray(respObj.data)) {
            data = respObj.data;
          } else if (Array.isArray(respObj.message)) {
            data = respObj.message.map((err: any) => {
              if (typeof err === 'object' && err !== null && err.field && err.message) {
                return err;
              }
              if (typeof err === 'string') {
                return {
                  field: 'body',
                  message: err,
                };
              }
              return err;
            });
          } else {
            data = respObj.data || respObj.error || null;
          }
        } else {
          message = respObj.message || exception.message;
          data = respObj.data || respObj.error || null;
        }
      }
    } else if (exception instanceof Error) {
      if (exception.name === 'ValidationError') {
        statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
        message = 'Lỗi xác thực dữ liệu';
      } else if (exception.name === 'CastError') {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Định dạng tham số không hợp lệ';
      } else if ((exception as any).code === 11000) {
        statusCode = HttpStatus.CONFLICT;
        message = 'Dữ liệu đã tồn tại';
      } else {
        message = exception.message;
      }
    }

    this.logger.error(
      `Exception caught [${statusCode}]: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const formattedResponse = ServiceResponse.failure(
      message,
      data,
      statusCode,
    );

    response.status(statusCode).json(formattedResponse);
  }
}
