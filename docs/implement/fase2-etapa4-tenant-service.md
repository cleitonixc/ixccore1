# Fase 2 - Etapa 4: Desenvolvimento do tenant-service

## Objetivo
Implementar o serviço de gerenciamento de tenants com sistema de permissões híbrido.

## Pré-requisitos
- Etapa 3 (auth-service) concluída
- Sistema de autenticação funcionando
- Banco de dados configurado com suporte a schemas

## Exemplos de Referência
Utilize os exemplos em `docs/exemplos/` como base:
- `controller.example.ts`: Para estrutura do TenantController
- `service.example.ts`: Para estrutura do TenantService
- `module.example.ts`: Para configuração do TenantModule
- `base.entity.ts`: Para campos comuns de entidades
- `tenant.entity.ts`: Para implementação da entidade de tenant
- `tenant-permission.entity.ts`: Para implementação das permissões
- `tenant-audit.entity.ts`: Para implementação da auditoria

## Checklist

### 1. Entidades e DTOs
- [ ] Criar core/src/tenant-service/entities/tenant.entity.ts
  - Usar como base o exemplo em `docs/exemplos/tenant.entity.ts`
  - Adaptar campos conforme necessidade

- [ ] Criar core/src/tenant-service/entities/tenant-permission.entity.ts
  - Usar como base o exemplo em `docs/exemplos/tenant-permission.entity.ts`
  - Adaptar campos conforme necessidade

- [ ] Criar core/src/tenant-service/entities/tenant-audit.entity.ts
  - Usar como base o exemplo em `docs/exemplos/tenant-audit.entity.ts`
  - Adaptar campos conforme necessidade

- [ ] Criar core/src/tenant-service/dto/tenant.dto.ts:
```typescript
export class CreateTenantDto {
  name: string;
  schema: string;
  settings?: Record<string, any>;
}

export class UpdateTenantDto {
  name?: string;
  settings?: Record<string, any>;
  isActive?: boolean;
}

export class TenantPermissionDto {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}
```

### 2. Serviço de Tenant
- [ ] Criar core/src/tenant-service/tenant.service.ts:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TenantEntity } from './entities/tenant.entity';
import { TenantPermissionEntity } from './entities/tenant-permission.entity';
import { CreateTenantDto, UpdateTenantDto, TenantPermissionDto } from './dto/tenant.dto';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(TenantEntity)
    private tenantRepository: Repository<TenantEntity>,
    @InjectRepository(TenantPermissionEntity)
    private permissionRepository: Repository<TenantPermissionEntity>,
    private dataSource: DataSource,
  ) {}

  async create(createTenantDto: CreateTenantDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Criar tenant
      const tenant = this.tenantRepository.create(createTenantDto);
      await this.tenantRepository.save(tenant);

      // Criar schema
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${createTenantDto.schema}"`);

      await queryRunner.commitTransaction();
      return tenant;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll() {
    return this.tenantRepository.find({
      relations: ['permissions'],
    });
  }

  async findOne(id: string) {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto) {
    const tenant = await this.findOne(id);
    Object.assign(tenant, updateTenantDto);
    return this.tenantRepository.save(tenant);
  }

  async setPermissions(id: string, permissions: TenantPermissionDto[]) {
    const tenant = await this.findOne(id);
    
    // Remover permissões existentes
    await this.permissionRepository.delete({ tenant: { id } });

    // Criar novas permissões
    const newPermissions = permissions.map(permission =>
      this.permissionRepository.create({
        ...permission,
        tenant,
      }),
    );

    await this.permissionRepository.save(newPermissions);
    return this.findOne(id);
  }

  async getPermissions(id: string) {
    const tenant = await this.findOne(id);
    return tenant.permissions;
  }
}
```

### 3. Controlador de Tenant
- [ ] Criar core/src/tenant-service/tenant.controller.ts:
```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth-service/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../auth-service/guards/super-admin.guard';
import { RequireSuperAdmin } from '../auth-service/decorators/super-admin.decorator';
import { TenantService } from './tenant.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  TenantPermissionDto,
} from './dto/tenant.dto';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Post()
  @UseGuards(SuperAdminGuard)
  @RequireSuperAdmin()
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantService.create(createTenantDto);
  }

  @Get()
  @UseGuards(SuperAdminGuard)
  @RequireSuperAdmin()
  findAll() {
    return this.tenantService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Put(':id')
  @UseGuards(SuperAdminGuard)
  @RequireSuperAdmin()
  update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    return this.tenantService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  @RequireSuperAdmin()
  remove(@Param('id') id: string) {
    return this.tenantService.remove(id);
  }

  @Put(':id/permissions')
  @UseGuards(SuperAdminGuard)
  @RequireSuperAdmin()
  setPermissions(
    @Param('id') id: string,
    @Body() permissions: TenantPermissionDto[],
  ) {
    return this.tenantService.setPermissions(id, permissions);
  }

  @Get(':id/permissions')
  getPermissions(@Param('id') id: string) {
    return this.tenantService.getPermissions(id);
  }
}
```

### 4. Módulo de Tenant
- [ ] Criar core/src/tenant-service/tenant.module.ts:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantEntity } from './entities/tenant.entity';
import { TenantPermissionEntity } from './entities/tenant-permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantEntity, TenantPermissionEntity]),
  ],
  providers: [TenantService],
  controllers: [TenantController],
  exports: [TenantService],
})
export class TenantModule {}
```

### 5. Middleware de Tenant
- [ ] Criar core/src/tenant-service/middleware/tenant.middleware.ts:
```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../tenant.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private tenantService: TenantService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (tenantId) {
      const tenant = await this.tenantService.findOne(tenantId);
      req['tenant'] = tenant;
    }
    next();
  }
}
```

### 6. Decorators de Tenant
- [ ] Criar core/src/tenant-service/decorators/tenant.decorator.ts:
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);
```

### 7. Guards de Permissão
- [ ] Criar core/src/tenant-service/guards/permission.guard.ts:
```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantService } from '../tenant.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tenantService: TenantService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(
      'permission',
      context.getHandler(),
    );
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // SuperAdmin tem todas as permissões
    if (user.isSuperAdmin) {
      return true;
    }

    const tenant = request.tenant;
    if (!tenant) {
      return false;
    }

    const permissions = await this.tenantService.getPermissions(tenant.id);
    return permissions.some(p => 
      p.resource === requiredPermission && 
      p.actions.includes('access')
    );
  }
}
```

### 8. Serviço de Auditoria
- [ ] Criar core/src/tenant-service/services/audit.service.ts:
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantAuditEntity } from '../entities/tenant-audit.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(TenantAuditEntity)
    private auditRepository: Repository<TenantAuditEntity>,
  ) {}

  async logAction(data: {
    tenantId: string;
    userId: string;
    action: string;
    details: any;
    isSuperAdmin: boolean;
  }) {
    const audit = this.auditRepository.create({
      ...data,
      timestamp: new Date(),
    });
    return this.auditRepository.save(audit);
  }

  async getAuditLogs(tenantId: string) {
    return this.auditRepository.find({
      where: { tenantId },
      order: { timestamp: 'DESC' },
    });
  }
}
```

## Prompt para Agente

```markdown
### Tarefa: Implementação do Serviço de Tenant
**Contexto**: Autenticação implementada, agora precisamos do gerenciamento de tenants.

**Objetivo**: Criar um serviço de tenant com sistema de permissões híbrido.

**Entrada**: 
- Estrutura do core package
- Auth service implementado
- Requisitos:
  - CRUD de tenants
  - Gerenciamento de permissões
  - Middleware de tenant
  - Guards de permissão

**Saída Esperada**:
- API de tenants funcional
- Sistema de permissões implementado
- Middleware e guards configurados
- Testes de integração passando

**Instruções**:
1. Siga o checklist na ordem apresentada
2. Implemente cada componente
3. Teste as funcionalidades
4. Valide o sistema de permissões

**Validação**:
```bash
# Criar tenant
curl -X POST http://localhost:3000/tenants \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Tenant","schema":"test"}'

# Definir permissões
curl -X PUT http://localhost:3000/tenants/{id}/permissions \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '[{"resource":"users","actions":["read","write"]}]'

# Testar rota protegida com tenant
curl -X GET http://localhost:3000/protected \
  -H "Authorization: Bearer {token}" \
  -H "X-Tenant-ID: {tenant_id}"
``` 