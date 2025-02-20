import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Injectable()
export class QueueService {
  constructor(@Inject('QUEUE_SERVICE') private readonly client: ClientProxy) {}

  send<TResult = any, TInput = any>(
    pattern: string,
    data: TInput,
  ): Observable<TResult> {
    return this.client.send(pattern, data);
  }

  emit<TInput = any>(pattern: string, data: TInput): Observable<void> {
    return this.client.emit(pattern, data);
  }

  async connect() {
    return this.client.connect();
  }

  async close() {
    return this.client.close();
  }
}
