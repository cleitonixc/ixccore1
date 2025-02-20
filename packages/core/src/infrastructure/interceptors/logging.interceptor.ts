import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../logging/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    this.logger.logRequest(request, 'HTTP');

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;
          this.logger.logResponse(response, 'HTTP', duration);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.logError(error, 'HTTP', request);
          this.logger.logResponse(
            { statusCode: error.status || 500 },
            'HTTP',
            duration,
          );
        },
      }),
    );
  }
}
