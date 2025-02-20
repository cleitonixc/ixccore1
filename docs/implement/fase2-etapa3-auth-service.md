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

### 1. Configuração Inicial ✅
- [x] Instalar dependências:
```bash
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt passport-local bcrypt
pnpm add -D @types/passport-jwt @types/passport-local @types/bcrypt
pnpm add class-validator class-transformer
pnpm add @nestjs/throttler uuid
```

### 2. Entidades e DTOs ✅
- [x] Criar core/src/auth-service/entities/user.entity.ts
- [x] Criar core/src/auth-service/entities/refresh-token.entity.ts
- [x] Criar core/src/auth-service/entities/audit-log.entity.ts
- [x] Criar core/src/auth-service/dto/auth.dto.ts

### 3. Guards e Decorators ✅
- [x] Criar core/src/auth-service/guards/jwt-auth.guard.ts
- [x] Criar core/src/auth-service/guards/super-admin.guard.ts
- [x] Criar core/src/auth-service/guards/local-auth.guard.ts

### 4. Estratégias de Autenticação ✅
- [x] Criar core/src/auth-service/strategies/jwt.strategy.ts
- [x] Criar core/src/auth-service/strategies/local.strategy.ts

### 5. Serviços ✅
- [x] Criar core/src/auth-service/auth.service.ts
- [x] Criar core/src/auth-service/services/audit-log.service.ts

### 6. Controlador ✅
- [x] Criar core/src/auth-service/auth.controller.ts com endpoints:
  - [x] POST /auth/login
  - [x] POST /auth/register
  - [x] POST /auth/refresh
  - [x] POST /auth/logout
  - [x] GET /auth/profile

### 7. Módulo ✅
- [x] Criar core/src/auth-service/auth.module.ts
- [x] Configurar imports
- [x] Configurar providers
- [x] Configurar exports

### 8. Recursos de Segurança ✅
- [x] Rate Limiting
  - [x] Limite global de 10 requisições por minuto
  - [x] Bloqueio após 5 tentativas falhas de login em 15 minutos
- [x] Refresh Token
  - [x] Geração e validação
  - [x] Expiração configurável
  - [x] Revogação de tokens
- [x] Logs de Auditoria
  - [x] Registro de tentativas de login/registro
  - [x] Tracking de IP e User Agent
  - [x] Status e detalhes das operações

### 9. Configuração de Ambiente ✅
- [x] Adicionar variáveis ao .env:
```env
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRATION=1h
```

### 10. Próximos Passos
- [ ] Criar migrations para as tabelas:
  - [ ] users
  - [ ] refresh_tokens
  - [ ] audit_logs
- [ ] Implementar testes unitários
- [ ] Implementar testes de integração
- [ ] Documentar API com Swagger

## Endpoints Disponíveis

### POST /auth/login
```typescript
// Request
{
  "email": "string",
  "password": "string",
  "tenantId": "string" // opcional
}

// Response
{
  "access_token": "string",
  "refresh_token": "string",
  "user": {
    "id": "string",
    "email": "string",
    "tenantId": "string",
    "roles": "string[]",
    "isSuperAdmin": "boolean"
  }
}
```

### POST /auth/register (requer superAdmin)
```typescript
// Request
{
  "email": "string",
  "password": "string",
  "tenantId": "string", // opcional
  "roles": "string[]", // opcional
  "isSuperAdmin": "boolean" // opcional
}

// Response
{
  "id": "string",
  "email": "string",
  "tenantId": "string",
  "roles": "string[]",
  "isSuperAdmin": "boolean"
}
```

### POST /auth/refresh
```typescript
// Request
{
  "refreshToken": "string"
}

// Response
{
  "access_token": "string",
  "refresh_token": "string",
  "user": {
    "id": "string",
    "email": "string",
    "tenantId": "string",
    "roles": "string[]",
    "isSuperAdmin": "boolean"
  }
}
```

### POST /auth/logout (requer autenticação)
```typescript
// Response
{
  "message": "Logged out successfully"
}
```

### GET /auth/profile (requer autenticação)
```typescript
// Response
{
  "sub": "string",
  "email": "string",
  "tenantId": "string",
  "roles": "string[]",
  "isSuperAdmin": "boolean"
}
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
``` 