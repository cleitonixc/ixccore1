import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables
config({
  path: resolve(__dirname, '../.env.test'),
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.TENANT_ID = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USER = 'ixccore';
process.env.DB_PASS = 'ixccore';
process.env.DB_NAME = 'ixccore_test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.RABBITMQ_URL = 'amqp://ixccore:ixccore@localhost:5672';

// Increase test timeout
jest.setTimeout(30000);
