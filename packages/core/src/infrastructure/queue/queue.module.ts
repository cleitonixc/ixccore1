import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';

const QUEUE_SERVICE_TOKEN = 'QUEUE_SERVICE';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: QUEUE_SERVICE_TOKEN,
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
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
