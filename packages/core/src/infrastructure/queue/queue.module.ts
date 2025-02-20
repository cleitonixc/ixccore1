import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'QUEUE_SERVICE',
        useFactory: (configService: ConfigService) => {
          const url = configService.getOrThrow<string>('RABBITMQ_URL');
          return {
            transport: Transport.RMQ,
            options: {
              urls: [url],
              queue: `${configService.get('TENANT_ID')}_queue`,
              queueOptions: {
                durable: true,
              },
            },
          };
        },
        inject: [ConfigService],
      },
    ]),
  ],
  exports: ['QUEUE_SERVICE'],
})
export class QueueModule {}
