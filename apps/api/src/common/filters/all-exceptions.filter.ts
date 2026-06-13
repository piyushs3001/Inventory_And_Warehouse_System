import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
}

/**
 * Global exception filter. Normalizes every error into a consistent body and,
 * critically, maps any unexpected (non-HTTP) exception to a generic 500 so
 * internals/stack traces never leak to the client (CLAUDE.md: "never leak
 * internals"). HttpExceptions keep their status, message and error label.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else {
        const body = response as {
          message?: string | string[];
          error?: string;
        };
        if (body.message !== undefined) message = body.message;
        if (body.error !== undefined) error = body.error;
      }
    } else {
      // Unexpected/non-HTTP error: log the real cause server-side so it is not
      // swallowed, but return only a generic message to the caller.
      this.logger.error(
        `Unhandled exception on ${req.method} ${req.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorBody = {
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: req.url,
    };
    res.status(status).json(body);
  }
}
