import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CacheModule } from '../../src/infrastructure/cache/cache.module';
import { ConfigModule } from '../../src/infrastructure/config/config.module';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

describe('CacheModule (e2e)', () => {
  let app: INestApplication;
  let cacheManager: Cache;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, CacheModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    cacheManager = app.get(CACHE_MANAGER);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should set and get cache value', async () => {
    const key = 'test-key';
    const value = { data: 'test-value' };

    await cacheManager.set(key, value);
    const result = await cacheManager.get(key);

    expect(result).toEqual(value);
  });

  it('should handle tenant-specific cache keys', async () => {
    const tenant1Key = 'tenant1:test-key';
    const tenant2Key = 'tenant2:test-key';
    const value1 = { data: 'tenant1-value' };
    const value2 = { data: 'tenant2-value' };

    await cacheManager.set(tenant1Key, value1);
    await cacheManager.set(tenant2Key, value2);

    const result1 = await cacheManager.get(tenant1Key);
    const result2 = await cacheManager.get(tenant2Key);

    expect(result1).toEqual(value1);
    expect(result2).toEqual(value2);
  });

  it('should handle cache TTL', async () => {
    const key = 'ttl-test-key';
    const value = { data: 'ttl-test-value' };
    const ttl = 1000; // 1 second

    await cacheManager.set(key, value, ttl);
    const immediateResult = await cacheManager.get(key);
    expect(immediateResult).toEqual(value);

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, ttl + 100));
    const expiredResult = await cacheManager.get(key);
    expect(expiredResult).toBeUndefined();
  });
});
