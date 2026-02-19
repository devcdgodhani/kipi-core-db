import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  requestId?: string;
}

/**
 * Wraps all successful HTTP responses in a standard envelope:
 * { success, statusCode, message, data, timestamp }
 */
@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map((data) => {
        const statusCode = response.statusCode || 200;

        // Extract message from the response if provided
        let message = 'Success';
        let responseData = data;

        if (data && typeof data === 'object' && 'message' in data && 'data' in data) {
          message = data.message;
          responseData = data.data;
        }

        return {
          success: true,
          statusCode,
          message,
          data: responseData,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
