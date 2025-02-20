# Fase 2 - Etapa 5: Desenvolvimento do user-service

## Objetivo
Implementar o serviço de usuários com suporte a perfis e sessões multi-tenant.

## Pré-requisitos
- Etapa 3 (auth-service) concluída
- Etapa 4 (tenant-service) concluída
- Sistema de autenticação e permissões funcionando

## Exemplos de Referência
Utilize os exemplos em `docs/exemplos/` como base:
- `controller.example.ts`: Para estrutura do UserController
- `service.example.ts`: Para estrutura do UserService
- `module.example.ts`: Para configuração do UserModule
- `base.entity.ts`: Para campos comuns de entidades
- `user.entity.ts`: Para implementação do perfil de usuário
- `auth.guard.ts`: Para implementação dos guards de acesso

## Checklist

### 1. Entidades e DTOs
- [ ] Criar core/src/user-service/entities/user-profile.entity.ts
  - Usar como base o exemplo em `docs/exemplos/user.entity.ts`
  - Adaptar campos para perfil específico

- [ ] Criar core/src/user-service/entities/user-session.entity.ts
  - Extender de BaseEntity
  - Implementar campos específicos para sessão

- [ ] Criar core/src/user-service/dto/user-profile.dto.ts:
```typescript
export class CreateProfileDto {
  firstName: string;
  lastName: string;
  avatar?: string;
  preferences?: Record<string, any>;
}

export class UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  preferences?: Record<string, any>;
}
```

### 2. Serviço de Usuário
- [ ] Criar core/src/user-service/user.service.ts:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../auth-service/entities/user.entity';
import { UserProfileEntity } from './entities/user-profile.entity';
import { UserSessionEntity } from './entities/user-session.entity';
import { CreateProfileDto, UpdateProfileDto } from './dto/user-profile.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(UserProfileEntity)
    private profileRepository: Repository<UserProfileEntity>,
    @InjectRepository(UserSessionEntity)
    private sessionRepository: Repository<UserSessionEntity>,
  ) {}

  async findAll() {
    return this.userRepository.find({
      relations: ['profile'],
    });
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['profile'],
    });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async createProfile(userId: string, createProfileDto: CreateProfileDto) {
    const user = await this.findOne(userId);
    const profile = this.profileRepository.create({
      ...createProfileDto,
      user,
    });
    return this.profileRepository.save(profile);
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.findOne(userId);
    const profile = await this.profileRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }
    Object.assign(profile, updateProfileDto);
    return this.profileRepository.save(profile);
  }

  async createSession(userId: string, sessionData: Partial<UserSessionEntity>) {
    const user = await this.findOne(userId);
    const session = this.sessionRepository.create({
      ...sessionData,
      user,
    });
    return this.sessionRepository.save(session);
  }

  async getSessions(userId: string) {
    return this.sessionRepository.find({
      where: { user: { id: userId }, isActive: true },
    });
  }

  async deactivateSession(sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    session.isActive = false;
    return this.sessionRepository.save(session);
  }
}
```

### 3. Controlador de Usuário
- [ ] Criar core/src/user-service/user.controller.ts:
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
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth-service/guards/jwt-auth.guard';
import { PermissionGuard } from '../tenant-service/guards/permission.guard';
import { UserService } from './user.service';
import { CreateProfileDto, UpdateProfileDto } from './dto/user-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Post(':id/profile')
  createProfile(
    @Param('id') id: string,
    @Body() createProfileDto: CreateProfileDto,
  ) {
    return this.userService.createProfile(id, createProfileDto);
  }

  @Put(':id/profile')
  updateProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(id, updateProfileDto);
  }

  @Post('session')
  createSession(@Req() req) {
    const sessionData = {
      deviceId: req.headers['x-device-id'],
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
    return this.userService.createSession(req.user.sub, sessionData);
  }

  @Get(':id/sessions')
  getSessions(@Param('id') id: string) {
    return this.userService.getSessions(id);
  }

  @Delete('sessions/:id')
  deactivateSession(@Param('id') id: string) {
    return this.userService.deactivateSession(id);
  }
}
```

### 4. Módulo de Usuário
- [ ] Criar core/src/user-service/user.module.ts:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserEntity } from '../auth-service/entities/user.entity';
import { UserProfileEntity } from './entities/user-profile.entity';
import { UserSessionEntity } from './entities/user-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      UserProfileEntity,
      UserSessionEntity,
    ]),
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
```

### 5. Interceptors
- [ ] Criar core/src/user-service/interceptors/activity.interceptor.ts:
```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UserService } from '../user.service';

@Injectable()
export class ActivityInterceptor implements NestInterceptor {
  constructor(private userService: UserService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const sessionId = request.headers['x-session-id'];

    return next.handle().pipe(
      tap(() => {
        if (sessionId) {
          // Atualizar lastActivity da sessão
          this.userService.updateSessionActivity(sessionId);
        }
      }),
    );
  }
}
```

## Prompt para Agente

```markdown
### Tarefa: Implementação do Serviço de Usuário
**Contexto**: Autenticação e tenant implementados, agora precisamos do gerenciamento de usuários.

**Objetivo**: Criar um serviço de usuário com perfis e sessões.

**Entrada**: 
- Estrutura do core package
- Auth service implementado
- Tenant service implementado
- Requisitos:
  - Perfis de usuário
  - Gerenciamento de sessões
  - Tracking de atividade
  - Integração com tenant

**Saída Esperada**:
- API de usuários funcional
- Sistema de perfis implementado
- Gerenciamento de sessões funcionando
- Testes de integração passando

**Instruções**:
1. Siga o checklist na ordem apresentada
2. Implemente cada componente
3. Teste as funcionalidades
4. Valide a integração com tenant

**Validação**:
```bash
# Criar perfil
curl -X POST http://localhost:3000/users/{id}/profile \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe"}'

# Iniciar sessão
curl -X POST http://localhost:3000/users/session \
  -H "Authorization: Bearer {token}" \
  -H "X-Device-ID: test-device"

# Listar sessões ativas
curl -X GET http://localhost:3000/users/{id}/sessions \
  -H "Authorization: Bearer {token}"
``` 