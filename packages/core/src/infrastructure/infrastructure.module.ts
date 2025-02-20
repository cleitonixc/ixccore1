import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './cache/cache.module';
import { QueueModule } from './queue/queue.module';
import { MetricsModule } from './metrics/metrics.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { LoggerModule } from './logging/logger.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CacheModule,
    QueueModule,
    MetricsModule,
    TelemetryModule,
    LoggerModule,
    HealthModule,
  ],
  exports: [
    ConfigModule,
    DatabaseModule,
    CacheModule,
    QueueModule,
    MetricsModule,
    TelemetryModule,
    LoggerModule,
    HealthModule,
  ],
})
export class InfrastructureModule {}
