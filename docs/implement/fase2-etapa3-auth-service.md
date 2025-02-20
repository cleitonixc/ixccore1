# Fase 2 - Etapa 3: Desenvolvimento do auth-service

## Objetivo
Implementar o serviço de autenticação com JWT e estratégias de autenticação.

## Pré-requisitos
- Fase 1 completa
- Infraestrutura rodando
- Conhecimento de estratégias de autenticação NestJS

## Exemplos de Referência
Utilize os exemplos em `docs/exemplos/` como base:
- `controller.example.ts`: Para estrutura do AuthController
- `service.example.ts`: Para estrutura do AuthService
- `module.example.ts`: Para configuração do AuthModule
- `user.entity.ts`: Para implementação da entidade de usuário
- `auth.guard.ts`: Para implementação do guard de autenticação
- `super-admin.guard.ts`: Para implementação do guard de superAdmin

## Checklist

### 1. Configuração Inicial
- [ ] Instalar dependências:
```bash
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt passport-local bcrypt
pnpm add -D @types/passport-jwt @types/passport-local @types/bcrypt
```

### 2. Entidades e DTOs
- [ ] Criar core/src/auth-service/entities/user.entity.ts
  - Usar como base o exemplo em `docs/exemplos/user.entity.ts`
  - Adaptar campos conforme necessidade

### 3. Guards e Decorators
- [ ] Criar core/src/auth-service/guards/jwt-auth.guard.ts
  - Usar como base o exemplo em `docs/exemplos/auth.guard.ts`
  - Adaptar para JWT específico

- [ ] Criar core/src/auth-service/guards/super-admin.guard.ts
  - Usar como base o exemplo em `docs/exemplos/super-admin.guard.ts`
  - Adaptar validações conforme necessidade

### 4. Estratégias de Autenticação
- [ ] Criar core/src/auth-service/strategies/jwt.strategy.ts:
```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { TokenPayloadDto } from '../dto/auth.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: TokenPayloadDto) {
    return payload;
  }
}
```

- [ ] Criar core/src/auth-service/strategies/local.strategy.ts:
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

### 5. Serviço de Autenticação
- [ ] Criar core/src/auth-service/auth.service.ts:
```typescript
import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { LoginDto, RegisterDto, TokenPayloadDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException();
    }

    // Verificar se é superAdmin ou tem acesso ao tenant
    if (!user.isSuperAdmin && loginDto.tenantId && user.tenantId !== loginDto.tenantId) {
      throw new ForbiddenException('Access to this tenant is not allowed');
    }

    const payload: TokenPayloadDto = {
      sub: user.id,
      email: user.email,
      tenantId: loginDto.tenantId || user.tenantId,
      roles: user.roles,
      isSuperAdmin: user.isSuperAdmin,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(registerDto: RegisterDto) {
    // Apenas superAdmin pode criar outros superAdmins
    if (registerDto.isSuperAdmin) {
      const requestUser = await this.getCurrentUser(); // Implementar método para pegar usuário atual
      if (!requestUser?.isSuperAdmin) {
        throw new ForbiddenException('Only superAdmin can create other superAdmins');
      }
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
    });
    await this.userRepository.save(user);
    const { password, ...result } = user;
    return result;
  }

  async getCurrentUser() {
    // Implementar lógica para pegar usuário do contexto da requisição
  }
}
```

### 6. Controlador de Autenticação
- [ ] Criar core/src/auth-service/auth.controller.ts:
```typescript
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}
```

### 7. Módulo de Autenticação
- [ ] Criar core/src/auth-service/auth.module.ts:
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserEntity } from './entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

### 8. Configuração de Variáveis de Ambiente
- [ ] Adicionar ao .env:
```env
JWT_SECRET=your-super-secret-key
JWT_EXPIRATION=3600
```

## Prompt para Agente

```markdown
### Tarefa: Implementação do Serviço de Autenticação
**Contexto**: Infraestrutura base configurada, precisamos implementar autenticação.

**Objetivo**: Criar um serviço de autenticação com JWT e suporte multi-tenant.

**Entrada**: 
- Estrutura do core package
- Módulos de infraestrutura
- Requisitos:
  - Autenticação JWT
  - Suporte multi-tenant
  - Roles/permissões básicas

**Saída Esperada**:
- Endpoints de autenticação funcionais
- Estratégias JWT e Local configuradas
- Guards e decorators implementados
- Testes de integração passando

**Instruções**:
1. Siga o checklist na ordem apresentada
2. Implemente cada componente
3. Teste as funcionalidades
4. Valide o suporte multi-tenant

**Validação**:
```bash
# Teste de registro
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","tenantId":"test"}'

# Teste de login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Teste de rota protegida
curl -X GET http://localhost:3000/protected \
  -H "Authorization: Bearer {token}"
``` 