import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Logs every incoming HTTP request with method, URL, and response duration
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, ip } = req;
    const userAgent = req.headers['user-agent'] || '';
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          this.logger.log(
            `${method} ${url} ${res.statusCode} – ${Date.now() - now}ms [${ip}] ${userAgent}`,
          );
        },
        error: (err) => {
          this.logger.error(
            `${method} ${url} ${err.status || 500} – ${Date.now() - now}ms [${ip}]`,
            err.stack,
          );
        },
      }),
    );
  }
}
