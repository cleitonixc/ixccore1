/**
 * @file docs/exemplos/interceptor.example.ts
 * @description Interceptor base para logging, métricas e tracking.
 * Implementa padrões de observabilidade e auditoria para todas as requisições.
 * Integra com sistemas de logging, métricas e rastreamento distribuído.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Interceptor base para observabilidade
 * @description Processa requisições para logging e métricas
 */
@Injectable()
export class ObservabilityInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: any,
    private readonly metrics: any,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, path, body, user, tenant } = request;
    const startTime = Date.now();

    // Log da requisição
    this.logger.info('Request iniciada', {
      method,
      path,
      user: user?.id,
      tenant: tenant?.id,
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          
          // Log de sucesso
          this.logger.info('Request completada', {
            method,
            path,
            duration,
            user: user?.id,
            tenant: tenant?.id,
          });

          // Métricas
          this.metrics.recordRequestDuration(method, path, duration);
          this.metrics.incrementRequestCount(method, path, 200);
        },
        error: (error) => {
          const duration = Date.now() - startTime;

          // Log de erro
          this.logger.error('Request falhou', {
            method,
            path,
            duration,
            error: error.message,
            stack: error.stack,
            user: user?.id,
            tenant: tenant?.id,
          });

          // Métricas de erro
          this.metrics.incrementRequestCount(method, path, error.status || 500);
        },
      }),
    );
  }
} 