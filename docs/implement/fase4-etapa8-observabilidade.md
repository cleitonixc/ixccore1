# Fase 4 - Etapa 8: Configuração de Observabilidade

## Objetivo
Implementar observabilidade completa com logging estruturado, métricas e tracing.

## Pré-requisitos
- Fase 3 completa
- Docker e Docker Compose instalados
- Conhecimento básico de ELK Stack, Prometheus e Jaeger

## Exemplos de Referência
Utilize os exemplos em `docs/exemplos/` como base:
- `interceptor.example.ts`: Para implementação do interceptor de observabilidade
- `base.entity.ts`: Para campos de auditoria
- `tenant-audit.entity.ts`: Para padrão de logging

## Checklist

### 1. Configuração do ELK Stack
- [ ] Adicionar ao docker-compose.yml:
```yaml
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  kibana:
    image: docker.elastic.co/kibana/kibana:8.12.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

  logstash:
    image: docker.elastic.co/logstash/logstash:8.12.0
    volumes:
      - ./config/logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - "5044:5044"
    depends_on:
      - elasticsearch

  prometheus:
    image: prom/prometheus:v2.49.0
    volumes:
      - ./config/prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:10.2.3
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana

  jaeger:
    image: jaegertracing/all-in-one:1.54
    environment:
      - COLLECTOR_ZIPKIN_HOST_PORT=:9411
    ports:
      - "5775:5775/udp"
      - "6831:6831/udp"
      - "6832:6832/udp"
      - "5778:5778"
      - "16686:16686"
      - "14250:14250"
      - "14268:14268"
      - "14269:14269"
      - "9411:9411"

volumes:
  elasticsearch_data:
  prometheus_data:
  grafana_data:
```

### 2. Configuração do Logger
- [ ] Instalar dependências:
```bash
pnpm add winston winston-elasticsearch @willsoto/nestjs-prometheus @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-jaeger
```

- [ ] Criar core/src/infrastructure/logging/logger.service.ts:
```typescript
import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

@Injectable()
export class CustomLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    const esTransport = new ElasticsearchTransport({
      level: 'info',
      clientOpts: {
        node: 'http://localhost:9200',
        maxRetries: 5,
        requestTimeout: 10000,
      },
      indexPrefix: 'ixccore-logs',
    });

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      defaultMeta: { service: 'ixccore' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
        esTransport,
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }
}
```

### 3. Configuração de Métricas
- [ ] Criar core/src/infrastructure/metrics/metrics.module.ts:
```typescript
import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
```

- [ ] Criar core/src/infrastructure/metrics/metrics.service.ts:
```typescript
import { Injectable } from '@nestjs/common';
import { Counter, Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('http_request_total')
    private readonly requestCounter: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly requestDuration: Histogram<string>,
  ) {}

  incrementRequestCount(method: string, path: string, status: number) {
    this.requestCounter.inc({ method, path, status });
  }

  recordRequestDuration(method: string, path: string, duration: number) {
    this.requestDuration.observe({ method, path }, duration);
  }
}
```

### 4. Configuração de Tracing
- [ ] Criar core/src/infrastructure/tracing/tracing.ts:
```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export function setupTracing() {
  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'ixccore',
    }),
    traceExporter: new JaegerExporter({
      endpoint: 'http://localhost:14268/api/traces',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });
}
```

### 5. Interceptors de Observabilidade
- [ ] Criar core/src/infrastructure/interceptors/logging.interceptor.ts:
```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CustomLogger } from '../logging/logger.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class ObservabilityInterceptor implements NestInterceptor {
  constructor(
    private logger: CustomLogger,
    private metricsService: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, path } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          this.logger.log(
            `${method} ${path} completed in ${duration}ms`,
            'HTTP',
          );
          this.metricsService.incrementRequestCount(method, path, 200);
          this.metricsService.recordRequestDuration(
            method,
            path,
            duration / 1000,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `${method} ${path} failed in ${duration}ms: ${error.message}`,
            error.stack,
            'HTTP',
          );
          this.metricsService.incrementRequestCount(
            method,
            path,
            error.status || 500,
          );
          this.metricsService.recordRequestDuration(
            method,
            path,
            duration / 1000,
          );
        },
      }),
    );
  }
}
```

### 6. Configuração do Prometheus
- [ ] Criar config/prometheus/prometheus.yml:
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'ixccore'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### 7. Configuração do Grafana
- [ ] Criar dashboards básicos para:
  - Métricas de requisições HTTP
  - Latência de endpoints
  - Uso de recursos
  - Logs agregados
  - Traces distribuídos

### 8. Integração na Aplicação
- [ ] Modificar core/src/main.ts:
```typescript
import { NestFactory } from '@nestjs/core';
import { setupTracing } from './infrastructure/tracing/tracing';
import { CustomLogger } from './infrastructure/logging/logger.service';
import { ObservabilityInterceptor } from './infrastructure/interceptors/logging.interceptor';
import { AppModule } from './app.module';

async function bootstrap() {
  // Iniciar tracing antes de tudo
  setupTracing();

  const logger = new CustomLogger();
  const app = await NestFactory.create(AppModule, { logger });

  // Adicionar interceptor global
  app.useGlobalInterceptors(new ObservabilityInterceptor(
    logger,
    app.get(MetricsService),
  ));

  await app.listen(3000);
}
bootstrap();
```

## Prompt para Agente

```markdown
### Tarefa: Configuração de Observabilidade
**Contexto**: Aplicação funcional, agora precisamos adicionar observabilidade.

**Objetivo**: Implementar logging estruturado, métricas e tracing.

**Entrada**: 
- Aplicação NestJS funcionando
- Docker Compose configurado
- Requisitos:
  - ELK Stack para logs
  - Prometheus/Grafana para métricas
  - Jaeger para tracing
  - Interceptors para coleta

**Saída Esperada**:
- Logs estruturados no Kibana
- Métricas no Grafana
- Traces no Jaeger
- Dashboards configurados

**Instruções**:
1. Siga o checklist na ordem apresentada
2. Configure cada componente
3. Teste a coleta de dados
4. Valide os dashboards

**Validação**:
```bash
# Iniciar infraestrutura
docker-compose up -d

# Verificar endpoints
curl http://localhost:5601  # Kibana
curl http://localhost:9090  # Prometheus
curl http://localhost:3000  # Grafana
curl http://localhost:16686 # Jaeger

# Gerar tráfego de teste
ab -n 1000 -c 10 http://localhost:3000/api/test
``` 