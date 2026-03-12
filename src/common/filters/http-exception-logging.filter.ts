import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

type SerializableError = {
  name?: string;
  message?: string;
  stack?: string;
  cause?: unknown;
};

@Catch()
export class HttpExceptionLoggingFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(HttpExceptionLoggingFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      throw exception;
    }

    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { id?: string | number; user?: unknown }>();
    const response = ctx.getResponse<Response>();

    if (response.headersSent) {
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody =
      exception instanceof HttpException
        ? exception.getResponse()
        : {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Internal Server Error',
            message: 'Internal server error',
          };

    const logPayload = {
      reqId: request.id,
      method: request.method,
      path: request.originalUrl || request.url,
      query: request.query,
      params: request.params,
      user: request.user,
      status,
      exception: this.serializeException(exception),
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(logPayload, `Unhandled HTTP exception (${status})`);
    } else {
      this.logger.warn(logPayload, `Handled HTTP exception (${status})`);
    }

    response.status(status).json(this.normalizeResponseBody(responseBody, status));
  }

  private normalizeResponseBody(
    body: unknown,
    status: number,
  ): string | Record<string, unknown> {
    if (typeof body === 'string') {
      return {
        statusCode: status,
        message: body,
      };
    }

    if (body && typeof body === 'object') {
      return body as Record<string, unknown>;
    }

    return {
      statusCode: status,
      message: 'Request failed',
    };
  }

  private serializeException(exception: unknown): unknown {
    if (exception instanceof Error) {
      const payload: SerializableError = {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      };

      const cause = (exception as Error & { cause?: unknown }).cause;
      if (cause !== undefined) {
        payload.cause = this.serializeCause(cause);
      }

      return payload;
    }

    if (typeof exception === 'object' && exception !== null) {
      return exception;
    }

    return {
      value: String(exception),
    };
  }

  private serializeCause(cause: unknown): unknown {
    if (cause instanceof Error) {
      return {
        name: cause.name,
        message: cause.message,
        stack: cause.stack,
      };
    }

    return cause;
  }
}
