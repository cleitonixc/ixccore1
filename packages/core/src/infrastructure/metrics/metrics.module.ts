import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PrometheusModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        defaultMetrics: {
          enabled: true,
          prefix: configService.get('TENANT_ID'),
        },
        path: '/metrics',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class MetricsModule {}
