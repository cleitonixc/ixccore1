Documentação da Arquitetura Híbrida Multi-Tenant com NestJS

Visão Geral

Esta arquitetura é um monorepo híbrido construído com NestJS, projetado para suportar múltiplos domínios de negócio (como ecommerce e chat) enquanto mantém serviços fundamentais centralizados no pacote core. A abordagem híbrida permite que serviços sejam executados como microsserviços independentes ou como uma aplicação monolítica, dependendo das necessidades de deployment. Ela é escalável, segura e observável, com suporte a multi-tenancy, comunicação assíncrona, caching distribuído e padrões modernos de resiliência.

Estrutura do Projeto

O monorepo é organizado em pacotes distintos sob project/packages/:

- core/: Contém serviços fundamentais e reutilizáveis (autenticação, gestão de tenants, usuários) e infraestrutura compartilhada (banco de dados, cache, filas, etc.).
    
- ecommerce/: Pacote específico para serviços de comércio eletrônico, como pedidos (order-service) e produtos (product-service).
    
- chat/: Pacote dedicado a funcionalidades de chat, como mensagens em tempo real (chat-service).
    

A raiz do projeto contém configurações globais (package.json e tsconfig.json) para gerenciar dependências e TypeScript em todo o monorepo.

```text
project/
├── packages/
│   ├── core/                       # Serviços fundamentais e infraestrutura
│   ├── ecommerce/                  # Serviços de comércio eletrônico
│   ├── chat/                      # Serviços de chat
├── package.json                   # Dependências globais
└── tsconfig.json                  # Configuração global do TypeScript
```

---

Camadas da Arquitetura

1. Gateway Layer

- Tecnologia: Istio como API Gateway.
    
- Funções:
    
    - Roteamento baseado em subdomínios para multi-tenancy (ex.: tenant1.app.com).
        
    - Load balancing entre serviços.
        
    - Terminação SSL/TLS.
        
    - Rate limiting e circuit breaking por tenant.
        

1. Core Services (pacote core/)

- Propósito: Centraliza lógica compartilhada e serviços essenciais.
    
- Serviços:
    
    - auth-service/: Gerencia autenticação (JWT), autorização (RBAC/ACL) e sessões.
        
    - tenant-service/: Controla configurações de multi-tenancy, como isolamento por schema e subdomínio.
        
    - user-service/: Administra usuários, perfis e permissões.
        
- Componentes Compartilhados:
    
    - shared/: Decorators, filtros, guards, interceptors e utilitários reutilizáveis.
        
    - infrastructure/: Configurações de banco de dados (PostgreSQL), cache (Redis), filas (RabbitMQ) e armazenamento (local/S3).
        
    - providers/: Integrações externas (e-mail, pagamentos, notificações).
        
    - config/: Configurações modulares para banco, cache, filas e segurança.
        

1. Business Services

- Pacotes:
    
    - ecommerce/:
        
        - order-service/: Processa pedidos, pagamentos e status.
            
        - product-service/: Gerencia catálogo de produtos e estoque.
            
    - chat/:
        
        - chat-service/: Suporta mensagens em tempo real e histórico.
            
- Características:
    
    - Cada serviço é independente, com seus próprios módulos, controladores, serviços, repositórios, entidades, DTOs e testes.
        
    - Comunicação com core/ via APIs REST ou mensageria assíncrona.
        

1. Infrastructure Layer

- Tecnologias:
    
    - PostgreSQL: Banco de dados relacional com sharding por tenant.
        
    - Redis: Cache distribuído com prefixos por tenant.
        
    - RabbitMQ: Filas para processamento assíncrono entre serviços.
        
    - Armazenamento: Suporte a local e S3 para arquivos.
        

---

Características Principais

Multi-Tenancy

- Isolamento: Por subdomínio (ex.: tenant1.app.com) e schema no PostgreSQL.
    
- Sharding: Configurável por tenant, gerenciado pelo tenant-service.
    
- Rate Limiting e Quotas: Aplicados por tenant via Istio.
    
- Cache: Prefixos por tenant no Redis (ex.: tenant1:cache:key).
    
- Hierarquia de Acesso:
  - SuperAdmin: Acesso global irrestrito
  - Admin: Acesso total ao tenant específico
  - Usuários: Acesso baseado em roles dentro do tenant

Fluxo de Autenticação e Autorização

1. Autenticação
   - Login via email/senha ou JWT
   - Validação de credenciais
   - Verificação de status do usuário
   - Geração de token JWT com claims:
     ```json
     {
       "sub": "user-uuid",
       "email": "user@example.com",
       "tenantId": "tenant-uuid",
       "roles": ["admin", "user"],
       "isSuperAdmin": true/false
     }
     ```

2. Autorização
   - Verificação de token JWT
   - Validação de tenant
   - Checagem de permissões:
     - SuperAdmin: Bypass de todas as verificações
     - Usuários normais: Verificação de roles e permissões do tenant

3. Auditoria
   - Registro de todas as ações de superAdmin
   - Log de alterações em tenants
   - Histórico de acessos e modificações
   - Rastreamento de operações críticas

Escalabilidade

- Híbrida: Suporta execução como monolito (todos os serviços em um processo) ou microsserviços (serviços separados).
    
- Mensageria: RabbitMQ para desacoplamento e processamento assíncrono.
    
- Load Balancing: Gerenciado pelo Istio.
    

Observabilidade

- Logging: Estruturado com ELK Stack (via winston ou logger padrão do NestJS).
    
- Métricas: Prometheus e Grafana (via @willsoto/nestjs-prometheus).
    
- Distributed Tracing: Jaeger com OpenTelemetry (via @opentelemetry/instrumentations-nestjs-core).
    
- APM: Atatus para monitoramento de desempenho.
    

Segurança

- mTLS: Obrigatório entre serviços, gerenciado pelo Istio.
    
- Segredos: Vault com integração via node-vault.
    
- RBAC/ACL: Implementado com nest-casl no auth-service.
    
- Isolamento: Dados e configurações completamente isolados entre tenants.
    
- SuperAdmin: Usuário com privilégios globais para gerenciar todos os tenants.
  - Acesso irrestrito a todos os tenants
  - Capacidade de criar/gerenciar outros superAdmins
  - Auditoria completa de ações
  - Bypass de permissões por tenant
  - Gerenciamento de configurações globais

---

Estrutura Detalhada

packages/core/

```text
/core/
├── src/
│   ├── auth-service/              # Serviço de autenticação
│   │   ├── auth-service.module.ts # Módulo principal
│   │   ├── controllers/           # Endpoints REST
│   │   ├── services/              # Lógica de autenticação
│   │   ├── guards/                # Proteção de rotas
│   │   │   ├── jwt-auth.guard.ts # Guard JWT
│   │   │   ├── local-auth.guard.ts # Guard Local
│   │   │   └── super-admin.guard.ts # Guard SuperAdmin
│   │   ├── decorators/            # Decorators customizados
│   │   │   └── super-admin.decorator.ts # Decorator SuperAdmin
│   │   ├── strategies/            # Estratégias Passport
│   │   ├── interfaces/            # Tipos e contratos
│   │   └── entities/              # Entidades do banco
│   │       └── user.entity.ts    # Entidade de usuário com isSuperAdmin
│   ├── tenant-service/            # Gestão de tenants
│   │   ├── tenant-service.module.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   │   └── audit.service.ts  # Serviço de auditoria
│   │   ├── guards/
│   │   ├── interceptors/          # Interceptors para tenant
│   │   ├── interfaces/
│   │   └── entities/
│   │       ├── tenant.entity.ts
│   │       └── tenant-audit.entity.ts # Auditoria de ações
│   ├── user-service/              # Gestão de usuários
│   │   ├── user-service.module.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/          # Abstração do banco
│   │   ├── entities/
│   │   ├── dtos/                  # Data Transfer Objects
│   │   ├── interfaces/
│   │   └── tests/                 # Testes unitários
│   ├── shared/                    # Componentes compartilhados
│   │   ├── decorators/
│   │   ├── filters/               # Manipulação de exceções
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── interfaces/
│   │   ├── pipes/                 # Validação de entrada
│   │   └── utils/                 # Funções utilitárias
│   ├── infrastructure/            # Infraestrutura compartilhada
│   │   ├── database/              # PostgreSQL
│   │   │   ├── migrations/        # Migrações do banco
│   │   │   ├── seeds/             # Dados iniciais
│   │   │   └── scripts/           # Scripts utilitários
│   │   ├── cache/                 # Redis e memória
│   │   │   ├── redis/
│   │   │   └── memory/
│   │   ├── queue/                 # RabbitMQ
│   │   │   ├── rabbitmq/
│   │   │   └── consumers/         # Consumidores de filas
│   │   └── storage/               # Armazenamento
│   │       ├── local/
│   │       └── s3/
│   ├── providers/                 # Integrações externas
│   │   ├── mail/                  # Envio de e-mails
│   │   ├── payment/               # Pagamentos
│   │   ├── notification/          # Notificações
│   │   └── storage/               # Armazenamento externo
│   ├── config/                    # Configurações
│   │   ├── database/
│   │   ├── cache/
│   │   ├── queue/
│   │   └── security/
├── package.json                   # Dependências específicas
├── app.module.ts                  # Módulo raiz
└── main.ts                        # Entrada da aplicação
```

packages/ecommerce/

```text
/ecommerce/
├── src/
│   ├── order-service/             # Serviço de pedidos
│   │   ├── order-service.module.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── entities/
│   │   ├── dtos/
│   │   ├── interfaces/
│   │   └── tests/
│   ├── product-service/           # Serviço de produtos
│   │   ├── product-service.module.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── entities/
│   │   ├── dtos/
│   │   ├── interfaces/
│   │   └── tests/
├── package.json                   # Dependências específicas
├── app.module.ts                  # Módulo raiz
└── main.ts                        # Entrada da aplicação
```

packages/chat/

```text
/chat/
├── src/
│   ├── chat-service/              # Serviço de chat
│   │   ├── chat-service.module.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── entities/
│   │   ├── dtos/
│   │   ├── interfaces/
│   │   └── tests/
├── package.json                   # Dependências específicas
├── app.module.ts                  # Módulo raiz
└── main.ts                        # Entrada da aplicação
```

---

Pacotes Recomendados

|Componente|Pacote|Descrição|
|---|---|---|
|Banco de Dados|@nestjs/typeorm|Integração com PostgreSQL e multi-tenancy|
|Cache|@nestjs/redis|Cache distribuído com Redis|
|Mensageria|@nestjs/microservices|Suporte a RabbitMQ|
|Autenticação|@nestjs/passport<br>@nestjs/jwt|Autenticação e tokens JWT|
|Controle de Acesso|nest-casl|RBAC/ACL com CASL|
|Logging|winston|Logging estruturado para ELK|
|Métricas|@willsoto/nestjs-prometheus|Integração com Prometheus|
|Rastreio Distribuído|@opentelemetry/instrumentations-nestjs-core|OpenTelemetry para Jaeger|
|APM|Agente Node.js do Atatus|Monitoramento de desempenho|
|Segredos|node-vault|Integração com Vault|
|WebSocket (chat)|@nestjs/websockets|Suporte a mensagens em tempo real|

Implementação do SuperAdmin

1. Entidades e DTOs
```typescript
// user.entity.ts
@Entity('users')
export class UserEntity {
  @Column({ default: false })
  isSuperAdmin: boolean;
}

// auth.dto.ts
export class TokenPayloadDto {
  isSuperAdmin: boolean;
}
```

2. Guards e Decorators
```typescript
// super-admin.guard.ts
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return request.user?.isSuperAdmin === true;
  }
}

// super-admin.decorator.ts
export const RequireSuperAdmin = () => SetMetadata('requiresSuperAdmin', true);
```

3. Auditoria
```typescript
// tenant-audit.entity.ts
@Entity('tenant_audit_logs')
export class TenantAuditEntity {
  @Column()
  isSuperAdmin: boolean;
  
  @Column('json')
  details: Record<string, any>;
}
```

4. Uso em Controllers
```typescript
@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantController {
  @Post()
  @UseGuards(SuperAdminGuard)
  @RequireSuperAdmin()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }
}
```

---

Padrões e Práticas

Código

- Idioma: Código em inglês, documentação em português.
    
- Qualidade: Limites de complexidade e tamanho via ESLint.
    
- TypeScript: Strict mode ativado.
    
- Ferramentas: ESLint + Prettier obrigatórios.
    

Testes

- Cada serviço inclui pasta tests/ com testes unitários e de integração usando @nestjs/testing.
    

Builds e Deployment

- Monorepo: Gerenciado com npm workspaces ou yarn workspaces.
    
- CI/CD: Configuração recomendada com GitHub Actions ou GitLab CI, separando builds por pacote.
    

---

Benefícios da Arquitetura Híbrida

- Flexibilidade: Pode ser implantada como monolito para simplicidade ou microsserviços para escalabilidade.
    
- Reutilização: O pacote core/ reduz duplicação de código.
    
- Manutenção: Estrutura modular facilita atualizações e debugging.
    
- Resiliência: Circuit breakers (Istio), mensageria assíncrona (RabbitMQ) e cache (Redis) garantem robustez.
    

---

Esta documentação reflete uma arquitetura moderna, alinhada com as melhores práticas de desenvolvimento em NestJS, pronta para suportar múltiplos domínios de negócio e atender aos requisitos de multi-tenancy, observabilidade e segurança descritos. Se precisar de ajustes ou mais detalhes, é só avisar!