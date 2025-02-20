# Fase 4 - Etapa 9: Testes e Validação

## Objetivo
Implementar testes unitários e de integração para garantir a qualidade do código.

## Pré-requisitos
- Todas as etapas anteriores concluídas
- Conhecimento de Jest e Supertest
- Ambiente de desenvolvimento configurado

## Exemplos de Referência
Utilize os exemplos em `docs/exemplos/` como base:
- `base.entity.ts`: Para testes de entidades base
- `user.entity.ts`: Para testes de entidades complexas
- `auth.guard.ts`: Para testes de guards
- `tenant-audit.entity.ts`: Para testes de auditoria

## Padrões de Teste
- Seguir nomenclatura dos exemplos
- Documentar todos os testes
- Usar mocks apropriadamente
- Testar casos de erro
### 1. Configuração de Testes
- [ ] Instalar dependências:
```bash
pnpm add -D @nestjs/testing jest @types/jest supertest @types/supertest
```

- [ ] Configurar jest.config.ts:
```typescript
import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/'],
  moduleNameMapper: {
    '^@ixccore/(.*)$': '<rootDir>/packages/core/src/$1',
    '^@ixccore/ecommerce/(.*)$': '<rootDir>/packages/ecommerce/src/$1',
    '^@ixccore/chat/(.*)$': '<rootDir>/packages/chat/src/$1',
  },
};

export default config;
```

### 2. Testes do Auth Service
- [ ] Criar core/src/auth-service/tests/auth.service.spec.ts:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { UserEntity } from '../entities/user.entity';
import { Repository } from 'typeorm';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<UserEntity>;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(UserEntity));
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password when valid', async () => {
      const user = {
        id: '1',
        email: 'test@test.com',
        password: await service.hashPassword('password'),
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(user);

      const result = await service.validateUser('test@test.com', 'password');
      expect(result).toBeDefined();
      expect(result.password).toBeUndefined();
    });

    it('should return null when user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await service.validateUser('test@test.com', 'password');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token when login successful', async () => {
      const user = {
        id: '1',
        email: 'test@test.com',
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(user);
      jest.spyOn(jwtService, 'sign').mockReturnValue('token');

      const result = await service.login({
        email: 'test@test.com',
        password: 'password',
      });

      expect(result.access_token).toBeDefined();
      expect(result.access_token).toBe('token');
    });
  });
});
```

### 3. Testes do Tenant Service
- [ ] Criar core/src/tenant-service/tests/tenant.service.spec.ts:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TenantService } from '../tenant.service';
import { TenantEntity } from '../entities/tenant.entity';
import { TenantPermissionEntity } from '../entities/tenant-permission.entity';

describe('TenantService', () => {
  let service: TenantService;
  let dataSource: DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: getRepositoryToken(TenantEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TenantPermissionEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              query: jest.fn(),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create tenant and schema', async () => {
      const createTenantDto = {
        name: 'Test Tenant',
        schema: 'test',
      };

      const tenant = { id: '1', ...createTenantDto };

      const queryRunner = dataSource.createQueryRunner();
      jest.spyOn(queryRunner, 'query').mockResolvedValue(undefined);

      const result = await service.create(createTenantDto);

      expect(result).toBeDefined();
      expect(queryRunner.query).toHaveBeenCalledWith(
        'CREATE SCHEMA IF NOT EXISTS "test"',
      );
    });
  });
});
```

### 4. Testes do Order Service
- [ ] Criar ecommerce/src/order-service/tests/order.service.spec.ts:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderService } from '../order.service';
import { OrderEntity } from '../entities/order.entity';
import { OrderItemEntity } from '../entities/order-item.entity';

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OrderItemEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create order with items', async () => {
      const createOrderDto = {
        items: [
          {
            productId: '1',
            name: 'Product 1',
            price: 100,
            quantity: 2,
          },
        ],
      };

      const customer = { id: '1' };

      const result = await service.create(createOrderDto, customer);

      expect(result).toBeDefined();
      expect(result.total).toBe(200);
      expect(result.items).toHaveLength(1);
    });
  });
});
```

### 5. Testes do Chat Service
- [ ] Criar chat/src/chat-service/tests/chat.service.spec.ts:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from '../chat.service';
import { RoomEntity } from '../entities/room.entity';
import { MessageEntity } from '../entities/message.entity';

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(RoomEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MessageEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRoom', () => {
    it('should create chat room', async () => {
      const createRoomDto = {
        name: 'Test Room',
        participantIds: ['1', '2'],
      };

      const result = await service.createRoom(createRoomDto);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Room');
    });
  });
});
```

### 6. Testes de Integração
- [ ] Criar test/app.e2e-spec.ts:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/login (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'test123' })
      .expect(201)
      .expect(res => {
        expect(res.body.access_token).toBeDefined();
      });
  });

  it('/tenants (POST)', () => {
    return request(app.getHttpServer())
      .post('/tenants')
      .send({ name: 'Test Tenant', schema: 'test' })
      .expect(201)
      .expect(res => {
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBe('Test Tenant');
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### 7. Scripts de Teste
- [ ] Adicionar scripts ao package.json:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

### 8. CI/CD Pipeline
- [ ] Criar .github/workflows/test.yml:
```yaml
name: Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v4
    - name: Use Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'
    
    - name: Install dependencies
      run: pnpm install

    - name: Run tests
      run: pnpm test

    - name: Run e2e tests
      run: pnpm test:e2e

    - name: Upload coverage
      uses: actions/upload-artifact@v4
      with:
        name: coverage
        path: coverage
```

## Prompt para Agente

```markdown
### Tarefa: Implementação de Testes
**Contexto**: Aplicação completa, agora precisamos garantir a qualidade com testes.

**Objetivo**: Criar testes unitários e de integração para todos os serviços.

**Entrada**: 
- Código fonte completo
- Estrutura do projeto
- Requisitos:
  - Testes unitários
  - Testes de integração
  - Cobertura mínima de 80%
  - CI/CD pipeline

**Saída Esperada**:
- Testes implementados
- Pipeline configurado
- Cobertura de código adequada
- Documentação de testes

**Instruções**:
1. Siga o checklist na ordem apresentada
2. Implemente cada conjunto de testes
3. Valide a cobertura
4. Configure o pipeline

**Validação**:
```bash
# Rodar testes unitários
pnpm test

# Verificar cobertura
pnpm test:cov

# Rodar testes e2e
pnpm test:e2e

# Validar pipeline
gh workflow run test.yml
``` 