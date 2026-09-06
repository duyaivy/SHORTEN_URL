import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ServiceResponse } from '../responses/service-response.js';

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

        // Class-validator errors format: { message: Array | string, error: string, statusCode: number }
        if (Array.isArray(respObj.message)) {
          message = 'Validation Failed';
          data = respObj.message;
        } else {
          message = respObj.message || exception.message;
          data = respObj.error || null;
        }
      }
    } else if (exception instanceof Error) {
      // Mongoose / Native JS Error handling
      if (exception.name === 'ValidationError') {
        statusCode = HttpStatus.BAD_REQUEST;
        message = exception.message;
      } else if (exception.name === 'CastError') {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Invalid parameter format (CastError)';
      } else if ((exception as any).code === 11000) {
        statusCode = HttpStatus.CONFLICT;
        message = 'Duplicate Key Error';
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
