# Fase 3 - Etapa 7: Desenvolvimento do chat-service

## Objetivo
Implementar o serviço de chat em tempo real com WebSocket e permissões híbridas.

## Pré-requisitos
- Fase 2 completa
- Core package funcional
- Sistema de autenticação e permissões funcionando

## Exemplos de Referência
Utilize os exemplos em `docs/exemplos/` como base:
- `controller.example.ts`: Para estrutura do ChatController
- `service.example.ts`: Para estrutura do ChatService
- `module.example.ts`: Para configuração do ChatModule
- `base.entity.ts`: Para campos comuns de entidades
- `tenant.entity.ts`: Para padrão de relacionamentos
- `auth.guard.ts`: Para implementação dos guards de acesso
- `super-admin.guard.ts`: Para implementação de permissões especiais

## Checklist

### 1. Entidades e DTOs
- [ ] Criar chat/src/chat-service/entities/room.entity.ts:
```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, OneToMany, CreateDateColumn } from 'typeorm';
import { UserEntity } from '@ixccore/core/auth-service/entities/user.entity';
import { MessageEntity } from './message.entity';

@Entity('chat_rooms')
export class RoomEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: false })
  isPrivate: boolean;

  @Column('json', { default: {} })
  metadata: Record<string, any>;

  @ManyToMany(() => UserEntity)
  participants: UserEntity[];

  @OneToMany(() => MessageEntity, message => message.room)
  messages: MessageEntity[];

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] Criar chat/src/chat-service/entities/message.entity.ts:
```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { UserEntity } from '@ixccore/core/auth-service/entities/user.entity';
import { RoomEntity } from './room.entity';

@Entity('chat_messages')
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column('json', { default: {} })
  metadata: Record<string, any>;

  @ManyToOne(() => UserEntity)
  sender: UserEntity;

  @ManyToOne(() => RoomEntity, room => room.messages)
  room: RoomEntity;

  @CreateDateColumn()
  sentAt: Date;
}
```

- [ ] Criar chat/src/chat-service/dto/chat.dto.ts:
```typescript
export class CreateRoomDto {
  name: string;
  description?: string;
  isPrivate?: boolean;
  participantIds: string[];
  metadata?: Record<string, any>;
}

export class JoinRoomDto {
  roomId: string;
  userId: string;
}

export class SendMessageDto {
  content: string;
  metadata?: Record<string, any>;
}

export class MessagePayloadDto {
  id: string;
  content: string;
  senderId: string;
  roomId: string;
  sentAt: Date;
  metadata?: Record<string, any>;
}
```

### 2. Serviço de Chat
- [ ] Criar chat/src/chat-service/chat.service.ts:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomEntity } from './entities/room.entity';
import { MessageEntity } from './entities/message.entity';
import { CreateRoomDto, JoinRoomDto, SendMessageDto } from './dto/chat.dto';
import { UserEntity } from '@ixccore/core/auth-service/entities/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(RoomEntity)
    private roomRepository: Repository<RoomEntity>,
    @InjectRepository(MessageEntity)
    private messageRepository: Repository<MessageEntity>,
  ) {}

  async createRoom(createRoomDto: CreateRoomDto) {
    const room = this.roomRepository.create(createRoomDto);
    return this.roomRepository.save(room);
  }

  async findAllRooms() {
    return this.roomRepository.find({
      relations: ['participants'],
    });
  }

  async findRoom(id: string) {
    const room = await this.roomRepository.findOne({
      where: { id },
      relations: ['participants'],
    });
    if (!room) {
      throw new NotFoundException(`Room ${id} not found`);
    }
    return room;
  }

  async joinRoom(joinRoomDto: JoinRoomDto) {
    const room = await this.findRoom(joinRoomDto.roomId);
    room.participants = [...room.participants, { id: joinRoomDto.userId } as UserEntity];
    return this.roomRepository.save(room);
  }

  async leaveRoom(joinRoomDto: JoinRoomDto) {
    const room = await this.findRoom(joinRoomDto.roomId);
    room.participants = room.participants.filter(p => p.id !== joinRoomDto.userId);
    return this.roomRepository.save(room);
  }

  async saveMessage(roomId: string, senderId: string, messageDto: SendMessageDto) {
    const room = await this.findRoom(roomId);
    const message = this.messageRepository.create({
      ...messageDto,
      room,
      sender: { id: senderId } as UserEntity,
    });
    return this.messageRepository.save(message);
  }

  async getRoomMessages(roomId: string, limit = 50) {
    return this.messageRepository.find({
      where: { room: { id: roomId } },
      relations: ['sender'],
      order: { sentAt: 'DESC' },
      take: limit,
    });
  }
}
```

### 3. Gateway de Chat
- [ ] Criar chat/src/chat-service/chat.gateway.ts:
```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { ChatService } from './chat.service';
import { SendMessageDto, JoinRoomDto } from './dto/chat.dto';

@WebSocketGateway({
  cors: true,
  namespace: 'chat',
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private chatService: ChatService) {}

  async handleConnection(client: Socket) {
    const user = client.handshake.auth.user;
    client.join(`user_${user.id}`);
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: Socket, payload: JoinRoomDto) {
    const room = await this.chatService.joinRoom(payload);
    client.join(`room_${room.id}`);
    this.server.to(`room_${room.id}`).emit('userJoined', {
      roomId: room.id,
      userId: payload.userId,
    });
    return room;
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(client: Socket, payload: JoinRoomDto) {
    const room = await this.chatService.leaveRoom(payload);
    client.leave(`room_${room.id}`);
    this.server.to(`room_${room.id}`).emit('userLeft', {
      roomId: room.id,
      userId: payload.userId,
    });
    return room;
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, payload: { roomId: string; message: SendMessageDto }) {
    const user = client.handshake.auth.user;
    const message = await this.chatService.saveMessage(
      payload.roomId,
      user.id,
      payload.message,
    );
    this.server.to(`room_${payload.roomId}`).emit('message', {
      ...message,
      senderId: user.id,
    });
    return message;
  }
}
```

### 4. Guards e Interceptors
- [ ] Criar chat/src/chat-service/guards/ws-jwt.guard.ts:
```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = client.handshake.auth.token;

    try {
      const payload = this.jwtService.verify(token);
      client.handshake.auth.user = payload;
      return true;
    } catch (err) {
      throw new WsException('Invalid token');
    }
  }
}
```

### 5. Módulo de Chat
- [ ] Criar chat/src/chat-service/chat.module.ts:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { RoomEntity } from './entities/room.entity';
import { MessageEntity } from './entities/message.entity';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoomEntity, MessageEntity]),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ChatService, ChatGateway, WsJwtGuard],
  exports: [ChatService],
})
export class ChatModule {}
```

### 6. Cliente de Exemplo
- [ ] Criar chat/src/chat-service/examples/chat-client.ts:
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/chat', {
  auth: {
    token: 'your-jwt-token',
  },
});

socket.on('connect', () => {
  console.log('Connected to chat server');

  // Join room
  socket.emit('joinRoom', { roomId: 'room-id', userId: 'user-id' });

  // Listen for messages
  socket.on('message', (message) => {
    console.log('New message:', message);
  });

  // Send message
  socket.emit('sendMessage', {
    roomId: 'room-id',
    message: {
      content: 'Hello, world!',
    },
  });
});

socket.on('disconnect', () => {
  console.log('Disconnected from chat server');
});
```

## Prompt para Agente

```markdown
### Tarefa: Implementação do Serviço de Chat
**Contexto**: Core implementado, agora precisamos do serviço de chat em tempo real.

**Objetivo**: Criar um serviço de chat com WebSocket e permissões híbridas.

**Entrada**: 
- Estrutura do chat package
- Core package implementado
- Requisitos:
  - WebSocket com Socket.IO
  - Salas de chat
  - Mensagens em tempo real
  - Integração com tenant

**Saída Esperada**:
- WebSocket funcional
- Sistema de salas implementado
- Mensagens em tempo real
- Testes de integração passando

**Instruções**:
1. Siga o checklist na ordem apresentada
2. Implemente cada componente
3. Teste as funcionalidades
4. Valide a integração com tenant

**Validação**:
```bash
# Teste com cliente WebSocket
node chat-client.js

# Ou com wscat
wscat -c 'ws://localhost:3000/chat?token={jwt}'

# Enviar mensagem
{"event":"sendMessage","data":{"roomId":"room-id","message":{"content":"Hello"}}}

# Receber mensagem
{"event":"message","data":{"id":"msg-id","content":"Hello","senderId":"user-id"}}
``` 