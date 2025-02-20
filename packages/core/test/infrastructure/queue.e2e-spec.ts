import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { QueueModule } from '../../src/infrastructure/queue/queue.module';
import { ConfigModule } from '../../src/infrastructure/config/config.module';
import { ClientProxy } from '@nestjs/microservices';

describe('QueueModule (e2e)', () => {
  let app: INestApplication;
  let queueClient: ClientProxy;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, QueueModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    queueClient = app.get('QUEUE_SERVICE');
    await app.init();
    await queueClient.connect();
  });

  afterEach(async () => {
    await queueClient.close();
    await app.close();
  });

  it('should emit and receive message', (done) => {
    const testMessage = { test: 'message' };
    const pattern = 'test-pattern';

    // Subscribe to receive messages
    queueClient
      .send(pattern, testMessage)
      .subscribe((data: typeof testMessage) => {
        expect(data).toEqual(testMessage);
        done();
      });

    // Emit test message
    queueClient.emit(pattern, testMessage);
  });

  it('should handle message pattern with response', async () => {
    const testMessage = { test: 'request' };
    const pattern = 'test-request-pattern';
    const expectedResponse = { response: 'test-response' };

    // Setup message handler
    queueClient
      .send(pattern, testMessage)
      .subscribe((data: typeof testMessage) => {
        expect(data).toEqual(testMessage);
        return expectedResponse;
      });

    // Send message and wait for response
    const response = await queueClient.send(pattern, testMessage).toPromise();

    expect(response).toEqual(expectedResponse);
  });

  it('should handle tenant-specific patterns', (done) => {
    const tenant1Pattern = 'tenant1.test-pattern';
    const tenant2Pattern = 'tenant2.test-pattern';
    const message1 = { tenant: 'tenant1' };
    const message2 = { tenant: 'tenant2' };
    let received = 0;

    // Subscribe to tenant-specific patterns
    queueClient
      .send(tenant1Pattern, message1)
      .subscribe((data: typeof message1) => {
        expect(data).toEqual(message1);
        received++;
        if (received === 2) done();
      });

    queueClient
      .send(tenant2Pattern, message2)
      .subscribe((data: typeof message2) => {
        expect(data).toEqual(message2);
        received++;
        if (received === 2) done();
      });

    // Emit tenant-specific messages
    queueClient.emit(tenant1Pattern, message1);
    queueClient.emit(tenant2Pattern, message2);
  });
});
