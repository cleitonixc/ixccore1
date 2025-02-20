Sistema de Permissões Híbrido

Visão Geral

O sistema de permissões híbrido é projetado para equilibrar a centralização da autenticação e informações de alto nível no auth-service (pacote core/) com a autonomia dos serviços de negócios (como chat-service e order-service) para definir e aplicar regras de autorização específicas. Ele suporta uma arquitetura híbrida multi-tenant, permitindo flexibilidade para serviços independentes e configurações dinâmicas por tenant.

Objetivos

- Centralização mínima: O auth-service fornece dados essenciais (ex.: roles, tenantId) sem acoplar regras específicas de cada serviço.
    
- Descentralização inteligente: Cada serviço define suas próprias permissões com base em papéis ou configurações do tenant.
    
- Multi-tenancy: Regras podem variar por tenant, mantendo isolamento completo.
    
- Escalabilidade: Suporta execução como monolito ou microsserviços.
    

Características Principais

- Tokens JWT com informações leves (ex.: userId, tenantId, roles globais ou por domínio).
    
- Regras de autorização definidas localmente nos serviços, usando bibliotecas como nest-casl.
    
- Configurações dinâmicas por tenant gerenciadas pelo tenant-service.
    
- Validação em tempo real para REST e WebSocket.
    

---

Componentes do Sistema

1. auth-service (Core)

- Responsabilidades:
    
    - Autenticação de usuários (ex.: login com e-mail/senha).
        
    - Geração de tokens JWT com informações básicas de identidade e papéis.
        
    - Opcionalmente, fornecimento de permissões de alto nível por domínio (ex.: roles.chat).
        
- Saída: Token JWT com payload como:
    
    json
    
    ```json
    {
      "sub": "user123",
      "tenantId": "tenant1",
      "roles": {
        "global": ["user"],
        "chat": ["member"],
        "ecommerce": ["customer"]
      },
      "iat": 1677654321,
      "exp": 1677657921
    }
    ```
    

1. tenant-service (Core)

- Responsabilidades:
    
    - Armazenar configurações específicas por tenant, incluindo permissões associadas a papéis.
        
    - Expor endpoints ou eventos para consulta dessas configurações (ex.: /tenants/permissions?service=chat).
        
- Estrutura de Dados (exemplo no PostgreSQL):
    
    sql
    
    ```sql
    CREATE TABLE tenant_permissions (
      tenant_id VARCHAR(50),
      service VARCHAR(50),
      role VARCHAR(50),
      permission VARCHAR(50),
      PRIMARY KEY (tenant_id, service, role, permission)
    );
    INSERT INTO tenant_permissions VALUES
      ('tenant1', 'chat', 'member', 'send_message'),
      ('tenant1', 'chat', 'admin', 'delete_message'),
      ('tenant2', 'chat', 'member', 'read_history');
    ```
    

1. Serviços de Negócios (ex.: chat-service)

- Responsabilidades:
    
    - Validar tokens JWT recebidos usando AuthGuard do @nestjs/passport.
        
    - Mapear papéis do token em ações permitidas usando nest-casl ou lógica customizada.
        
    - Consultar configurações do tenant-service para regras dinâmicas, se necessário.
        
- Exemplo de Regras:
    
    - Usuários com roles.chat: member podem enviar mensagens.
        
    - Apenas roles.chat: admin pode deletar mensagens (configurado por tenant).
        

1. Infraestrutura Compartilhada

- Redis: Cacheia permissões ou tokens para validação rápida.
    
- RabbitMQ: Comunicação assíncrona para atualizações de permissões (ex.: revogar acesso).
    
- Istio: Aplica mTLS e roteamento entre serviços.
    

---

Fluxo de Autorização

1. Autenticação Inicial

- O cliente faz login no auth-service:
    
    ```text
    POST /auth/login
    Body: { "email": "user@tenant1.com", "password": "123456" }
    ```
    
- O auth-service valida as credenciais e retorna um token JWT:
    
    json
    
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
    

1. Requisição ao Serviço

- O cliente envia uma requisição ao chat-service (REST ou WebSocket) com o token:
    
    - REST: Authorization: Bearer <token>
        
    - WebSocket: ?token=<token> no handshake.
        

1. Validação do Token

- O chat-service usa AuthGuard('jwt') para verificar o token:
    
    - Extrai o payload (ex.: userId, tenantId, roles).
        
    - Verifica assinatura e expiração com a chave secreta (compartilhada via node-vault ou ambiente).
        

1. Aplicação das Regras

- O chat-service consulta as permissões:
    
    - Localmente: Mapeia roles em ações usando nest-casl.
        
    - Dinamicamente: Faz uma chamada ao tenant-service (cacheada no Redis) para regras específicas do tenant.
        
- Exemplo de lógica:
    
    typescript
    
    ```typescript
    if (user.roles.chat.includes('member') && tenantPermissions.allow('send_message')) {
      // Permitir ação
    }
    ```
    

1. Resposta

- Se autorizado, o chat-service processa a ação (ex.: envia mensagem).
    
- Caso contrário, retorna erro (ex.: 403 Forbidden).
    

---

Implementação no Código

No auth-service

typescript

```typescript
// auth-service.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthServiceModule {}

// auth.controller.ts
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: { email: string; password: string }) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    return this.authService.login(user);
  }
}

// auth.service.ts
@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async validateUser(email: string, password: string) {
    // Validação contra banco
    return {
      userId: 'user123',
      tenantId: 'tenant1',
      roles: { global: ['user'], chat: ['member'], ecommerce: ['customer'] },
    };
  }

  async login(user: any) {
    const payload = { sub: user.userId, tenantId: user.tenantId, roles: user.roles };
    return { access_token: this.jwtService.sign(payload) };
  }
}
```

No tenant-service

typescript

```typescript
// tenant-service.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([TenantPermissionEntity])],
  controllers: [TenantController],
  providers: [TenantService],
})
export class TenantServiceModule {}

// tenant.controller.ts
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('permissions')
  async getPermissions(@Query('service') service: string, @Req() req) {
    const tenantId = req.user.tenantId; // Do token JWT
    return this.tenantService.getPermissions(tenantId, service);
  }
}

// tenant.service.ts
@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(TenantPermissionEntity)
    private readonly repo: Repository<TenantPermissionEntity>,
  ) {}

  async getPermissions(tenantId: string, service: string) {
    return this.repo.find({ where: { tenantId, service } });
  }
}
```

No chat-service

typescript

```typescript
// chat.module.ts
@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET }),
    CaslModule, // nest-casl
  ],
  providers: [ChatGateway, ChatService, CaslAbilityFactory],
})
export class ChatModule {}

// chat.gateway.ts
@WebSocketGateway()
@UseGuards(AuthGuard('jwt'))
export class ChatGateway {
  constructor(
    private readonly chatService: ChatService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  @SubscribeMessage('message')
  async handleMessage(
    @MessageBody() message: string,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client['user'];
    const ability = this.caslAbilityFactory.createForUser(user);

    if (ability.can('send_message', 'Chat')) {
      this.chatService.sendMessage(user.userId, user.tenantId, message);
      client.emit('message', `Echo: ${message}`);
    } else {
      client.emit('error', 'Forbidden');
    }
  }
}

// casl-ability.factory.ts (usando nest-casl)
@Injectable()
export class CaslAbilityFactory {
  constructor(private readonly tenantService: TenantService) {}

  async createForUser(user: any) {
    const permissions = await this.tenantService.getPermissions(user.tenantId, 'chat');
    return defineAbility((can) => {
      permissions.forEach((perm) => {
        if (user.roles.chat?.includes(perm.role)) {
          can(perm.permission, 'Chat');
        }
      });
    });
  }
}
```

---

Benefícios do Modelo Híbrido

- Flexibilidade: Serviços definem suas regras sem depender de um auth-service sobrecarregado.
    
- Multi-Tenancy: Regras podem ser personalizadas por tenant via tenant-service.
    
- Desacoplamento: O auth-service foca em autenticação, enquanto serviços gerenciam autorização.
    
- Performance: Tokens JWT leves e consultas cacheadas no Redis otimizam desempenho.
    

Considerações

- Cache: Use Redis para armazenar resultados de tenant-service.getPermissions por tenant/serviço.
    
- Atualizações: Propague mudanças em permissões via RabbitMQ para serviços consumidores.
    
- Segurança: Garanta que apenas o tenantId do token seja usado para consultar permissões, evitando vazamentos entre tenants.