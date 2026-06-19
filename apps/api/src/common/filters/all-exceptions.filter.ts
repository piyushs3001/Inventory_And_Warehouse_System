import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponseDto } from '../dto/error-response.dto';

/** Convert an HttpStatus code into its standard label, e.g. 401 → "Unauthorized". */
function statusLabel(status: number): string {
  const key = HttpStatus[status] as string | undefined;
  if (!key) return 'Error';
  return key
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
    // The `error` label is derived from the final status unless the exception
    // supplies its own. Guard-thrown exceptions (e.g. Passport's bare
    // UnauthorizedException) carry no `error` field, so without this they would
    // mislabel a 401/403 as "Internal Server Error".
    let explicitError: string | undefined;

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
        if (body.error !== undefined) explicitError = body.error;
      }
    } else {
      // Unexpected/non-HTTP error: log the real cause server-side so it is not
      // swallowed, but return only a generic message to the caller.
      this.logger.error(
        `Unhandled exception on ${req.method} ${req.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseDto = {
      statusCode: status,
      error: explicitError ?? statusLabel(status),
      message,
      timestamp: new Date().toISOString(),
      path: req.url,
    };
    res.status(status).json(body);
  }
}
