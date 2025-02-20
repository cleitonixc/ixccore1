import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

@Module({
  providers: [
    {
      provide: 'TELEMETRY_SDK',
      useFactory: (configService: ConfigService) => {
        const sdk = new NodeSDK({
          serviceName: `${configService.get('TENANT_ID')}_service`,
          instrumentations: [new NestInstrumentation()],
          traceExporter: new JaegerExporter({
            endpoint: configService.get('JAEGER_ENDPOINT'),
          }),
        });
        sdk.start();
        return sdk;
      },
      inject: [ConfigService],
    },
  ],
})
export class TelemetryModule {}
