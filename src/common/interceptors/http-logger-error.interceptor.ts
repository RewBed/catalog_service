import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, throwError } from 'rxjs';

type ErrorCarrierResponse = {
  err?: unknown;
  raw?: {
    err?: unknown;
  };
};

@Injectable()
export class HttpLoggerErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    return next.handle().pipe(
      catchError((error) => {
        return throwError(() => {
          const response = context
            .switchToHttp()
            .getResponse<ErrorCarrierResponse>();

          if (response?.raw) {
            response.raw.err = error;
          } else if (response) {
            response.err = error;
          }

          return error;
        });
      }),
    );
  }
}
