import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { redactUrl } from '../utils/pii-redactor';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        errors = responseObj.errors || null;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    const safeUrl = redactUrl(request.url);

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: safeUrl,
      method: request.method,
      message,
      ...(errors && { errors }),
    };

    // Log error details
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${safeUrl} - ${status}`,
        JSON.stringify(errorResponse),
      );
      // Capture 5xx errors in Sentry (don't capture 4xx client errors)
      try {
        const Sentry = require('@sentry/node');
        Sentry.captureException(exception, {
          tags: { httpStatus: status },
          extra: { url: safeUrl, method: request.method },
        });
      } catch {
        // Sentry not configured, ignore
      }
    } else {
      // Log full validation details for 4xx so they appear in docker logs
      const detail = Array.isArray(message) ? message.join(', ') : message;
      this.logger.warn(
        `${request.method} ${safeUrl} - ${status}: ${detail}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
