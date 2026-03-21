import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { Observable, throwError } from 'rxjs';
import {
  serializeRpcContext,
  serializeUnknownError,
} from '../../core/logger/logging.utils';

type RpcErrorBody =
  | string
  | {
      status?: string;
      message?: string;
      [key: string]: unknown;
    };

@Catch()
export class AppExceptionLoggingFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AppExceptionLoggingFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): Observable<unknown> | void {
    const hostType = host.getType<'http' | 'rpc' | 'ws'>();

    if (hostType === 'http') {
      this.handleHttpException(exception, host);
      return;
    }

    if (hostType === 'rpc') {
      return this.handleRpcException(exception, host);
    }

    this.logger.error(
      {
        hostType,
        exception: serializeUnknownError(exception),
      },
      `Unhandled ${hostType} exception`,
    );

    throw exception;
  }

  private handleHttpException(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<
      Request & { id?: string | number; user?: unknown }
    >();
    const response = ctx.getResponse<Response>();

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
      headersSent: response.headersSent,
      exception: serializeUnknownError(exception),
    };

    if (response.headersSent) {
      this.logHttpException(
        status,
        logPayload,
        'HTTP exception after headers sent',
      );
      return;
    }

    this.logHttpException(
      status,
      logPayload,
      `Unhandled HTTP exception (${status})`,
    );
    response
      .status(status)
      .json(this.normalizeHttpResponseBody(responseBody, status));
  }

  private handleRpcException(
    exception: unknown,
    host: ArgumentsHost,
  ): Observable<unknown> {
    const rpcContext = host.switchToRpc();
    const error = this.normalizeRpcError(exception);

    this.logger.error(
      {
        transport: 'rpc',
        data: rpcContext.getData(),
        context: serializeRpcContext(rpcContext.getContext()),
        exception: serializeUnknownError(exception),
      },
      'Unhandled RPC exception',
    );

    return throwError(() => error);
  }

  private normalizeHttpResponseBody(
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

  private normalizeRpcError(exception: unknown): RpcErrorBody {
    if (exception instanceof RpcException) {
      const rpcError = exception.getError();
      return typeof rpcError === 'string'
        ? { status: 'error', message: rpcError }
        : (rpcError as RpcErrorBody);
    }

    if (exception instanceof Error) {
      return {
        status: 'error',
        message: exception.message || 'Internal server error',
      };
    }

    return {
      status: 'error',
      message: 'Internal server error',
    };
  }

  private logHttpException(
    status: number,
    payload: Record<string, unknown>,
    message: string,
  ): void {
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(payload, message);
      return;
    }

    this.logger.warn(payload, message);
  }
}
