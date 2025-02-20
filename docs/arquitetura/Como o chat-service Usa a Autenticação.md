Como o chat-service Usa a Autenticação

Visão Geral do Processo

O chat-service depende do auth-service para autenticar usuários e validar suas permissões antes de permitir acesso às funcionalidades do chat (como enviar mensagens ou acessar histórico). Isso é feito por meio de tokens JWT, que são gerados pelo auth-service e validados pelo chat-service. A autenticação é integrada ao sistema multi-tenant, garantindo que o acesso seja restrito ao tenant correto.

Componentes Envolvidos

1. auth-service (core):
    
    - Gera tokens JWT após autenticação bem-sucedida (ex.: login com e-mail/senha).
        
    - Fornece endpoints como /auth/login e /auth/validate.
        
    - Usa @nestjs/jwt e @nestjs/passport com estratégias como local e jwt.
        
2. chat-service (chat):
    
    - Valida tokens JWT recebidos em requisições (via headers ou WebSocket).
        
    - Usa guards para proteger endpoints e eventos WebSocket.
        
    - Consulta o auth-service ou user-service para informações adicionais, se necessário.
        
3. Infraestrutura Compartilhada:
    
    - Redis: Cacheia tokens ou informações de sessão para validação rápida.
        
    - RabbitMQ: Comunicação assíncrona entre serviços, se necessário (ex.: notificar logout).
        
    - Istio: Garante mTLS entre serviços e roteamento baseado em subdomínios.
        

---

Fluxo de Autenticação

1. Autenticação Inicial

- O cliente (ex.: aplicativo web ou mobile) envia uma requisição ao auth-service:
    
    ```text
    POST /auth/login
    Body: { "email": "user@tenant1.com", "password": "123456" }
    ```
    
- O auth-service valida as credenciais contra o banco (ex.: PostgreSQL no schema do tenant1).
    
- Após validação, gera um token JWT com informações como userId, tenantId e roles:
    
    json
    
    ```json
    {
      "sub": "user123",
      "tenantId": "tenant1",
      "roles": ["user"],
      "iat": 1677654321,
      "exp": 1677657921
    }
    ```
    
- Resposta ao cliente:
    
    json
    
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
    

1. Acesso ao chat-service

- O cliente usa o token para acessar o chat-service, seja via REST ou WebSocket:
    
    - REST: Inclui o token no header Authorization: Bearer <token>.
        
    - WebSocket: Envia o token no handshake inicial (ex.: query string ?token=<token> ou header customizado).
        
- O chat-service valida o token usando um guard (AuthGuard) configurado com a estratégia jwt.
    

1. Validação do Token

- O guard no chat-service:
    
    - Extrai o token do header ou handshake.
        
    - Usa @nestjs/jwt para verificar a assinatura e a expiração do token com a chave pública/segredo compartilhada (obtida do auth-service ou Vault).
        
    - Opcionalmente, consulta o Redis para verificar se o token foi revogado (ex.: após logout).
        
- Se válido, o payload do token (ex.: userId, tenantId) é injetado no contexto da requisição, permitindo que o chat-service processe a ação.
    

1. Autorização

- O chat-service usa nest-casl para verificar permissões baseadas em roles do token:
    
    - Exemplo: Apenas usuários com role user podem enviar mensagens.
        
    - O tenantId garante que o usuário só acesse dados do seu tenant.
        

1. Comunicação em Tempo Real

- Para WebSocket, o chat-service usa @nestjs/websockets:
    
    - O token é validado no evento de conexão (onConnection).
        
    - Mensagens subsequentes herdam o contexto autenticado.
        

---

Implementação no Código

No auth-service (core)

typescript

```typescript
// auth-service.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET, // ou obtido via Vault
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthServiceModule {}

// auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './services/auth.service';

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
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async validateUser(email: string, password: string) {
    // Validação contra banco (ex.: UserService)
    return { userId: 'user123', tenantId: 'tenant1', roles: ['user'] };
  }

  async login(user: any) {
    const payload = { sub: user.userId, tenantId: user.tenantId, roles: user.roles };
    return { access_token: this.jwtService.sign(payload) };
  }
}

// jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, tenantId: payload.tenantId, roles: payload.roles };
  }
}
```

No chat-service (chat)

typescript

```typescript
// chat-service.module.ts
import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './services/chat.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from '@core/auth-service/strategies/jwt.strategy'; // Importado de core

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Mesma chave do auth-service
    }),
  ],
  providers: [ChatGateway, ChatService, JwtStrategy],
})
export class ChatServiceModule {}

// chat.gateway.ts
import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
@UseGuards(AuthGuard('jwt')) // Valida token no handshake
export class ChatGateway {
  constructor(private readonly chatService: ChatService) {}

  @SubscribeMessage('message')
  handleMessage(@MessageBody() message: string, @ConnectedSocket() client: Socket) {
    const user = client['user']; // Payload do JWT injetado pelo guard
    this.chatService.sendMessage(user.userId, user.tenantId, message);
    client.emit('message', `Echo: ${message}`);
  }
}

// chat.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatService {
  sendMessage(userId: string, tenantId: string, message: string) {
    // Lógica para salvar mensagem no banco ou enviar via RabbitMQ
    console.log(`User ${userId} from tenant ${tenantId} sent: ${message}`);
  }
}
```

---

Detalhes Adicionais

Multi-Tenancy

- O tenantId no token JWT é usado pelo chat-service para garantir que mensagens sejam isoladas por tenant (ex.: schema tenant1_chat no PostgreSQL).
    
- O tenant-service pode ser consultado para configurações específicas (ex.: limites de mensagens por tenant).
    

Escalabilidade

- O uso de WebSocket com @nestjs/websockets suporta comunicação em tempo real escalável.
    
- Redis pode cachear sessões WebSocket para reduzir carga no auth-service.
    

Segurança

- Tokens são validados em cada conexão WebSocket e requisição REST.
    
- nest-casl pode restringir ações (ex.: apenas admins podem criar canais).
    

Observabilidade

- Logs de autenticação e mensagens são enviados ao ELK Stack.
    
- Métricas de conexões WebSocket são monitoradas via Prometheus.
    

---

Fluxo Resumido

1. Usuário faz login no auth-service e recebe um JWT.
    
2. Usuário conecta ao chat-service via WebSocket com o token.
    
3. chat-service valida o token com AuthGuard('jwt').
    
4. Payload do token (userId, tenantId, roles) é usado para processar mensagens.
    
5. Comunicação em tempo real prossegue com isolamento por tenant.
    

Essa abordagem garante que o chat-service seja seguro, escalável e integrado ao sistema multi-tenant da arquitetura híbrida. Se precisar de mais exemplos ou ajustes, é só pedir!