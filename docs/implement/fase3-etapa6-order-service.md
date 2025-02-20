# Fase 3 - Etapa 6: Desenvolvimento do order-service

## Objetivo
Implementar o serviço de pedidos no pacote ecommerce com suporte multi-tenant e permissões.

## Pré-requisitos
- Fase 2 completa
- Core package funcional
- Sistema de autenticação e permissões funcionando

## Exemplos de Referência
Utilize os exemplos em `docs/exemplos/` como base:
- `controller.example.ts`: Para estrutura do OrderController
- `service.example.ts`: Para estrutura do OrderService
- `module.example.ts`: Para configuração do OrderModule
- `base.entity.ts`: Para campos comuns de entidades
- `tenant.entity.ts`: Para padrão de relacionamentos
- `auth.guard.ts`: Para implementação dos guards de acesso

## Checklist

### 1. Entidades e DTOs
- [ ] Criar ecommerce/src/order-service/entities/order.entity.ts:
```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from '@ixccore/core/auth-service/entities/user.entity';
import { OrderItemEntity } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  number: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column('json', { default: {} })
  metadata: Record<string, any>;

  @ManyToOne(() => UserEntity)
  customer: UserEntity;

  @OneToMany(() => OrderItemEntity, item => item.order, { cascade: true })
  items: OrderItemEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

- [ ] Criar ecommerce/src/order-service/entities/order-item.entity.ts:
```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { OrderEntity } from './order.entity';

@Entity('order_items')
export class OrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column()
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column()
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @ManyToOne(() => OrderEntity, order => order.items)
  order: OrderEntity;
}
```

- [ ] Criar ecommerce/src/order-service/dto/order.dto.ts:
```typescript
import { OrderStatus } from '../entities/order.entity';

export class OrderItemDto {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export class CreateOrderDto {
  items: OrderItemDto[];
  metadata?: Record<string, any>;
}

export class UpdateOrderDto {
  status?: OrderStatus;
  metadata?: Record<string, any>;
}
```

### 2. Serviço de Pedidos
- [ ] Criar ecommerce/src/order-service/order.service.ts:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity, OrderStatus } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';
import { UserEntity } from '@ixccore/core/auth-service/entities/user.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderEntity)
    private orderRepository: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private itemRepository: Repository<OrderItemEntity>,
  ) {}

  private generateOrderNumber(): string {
    return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  async create(createOrderDto: CreateOrderDto, customer: UserEntity) {
    const order = this.orderRepository.create({
      number: this.generateOrderNumber(),
      customer,
      metadata: createOrderDto.metadata,
    });

    // Criar itens e calcular total
    const items = createOrderDto.items.map(item => {
      const orderItem = this.itemRepository.create({
        ...item,
        total: item.price * item.quantity,
        order,
      });
      return orderItem;
    });

    order.items = items;
    order.total = items.reduce((sum, item) => sum + item.total, 0);

    return this.orderRepository.save(order);
  }

  async findAll() {
    return this.orderRepository.find({
      relations: ['customer', 'items'],
    });
  }

  async findOne(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['customer', 'items'],
    });
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.findOne(id);
    Object.assign(order, updateOrderDto);
    return this.orderRepository.save(order);
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.findOne(id);
    order.status = status;
    return this.orderRepository.save(order);
  }

  async findByCustomer(customerId: string) {
    return this.orderRepository.find({
      where: { customer: { id: customerId } },
      relations: ['items'],
    });
  }
}
```

### 3. Controlador de Pedidos
- [ ] Criar ecommerce/src/order-service/order.controller.ts:
```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '@ixccore/core/auth-service/guards/jwt-auth.guard';
import { PermissionGuard } from '@ixccore/core/tenant-service/guards/permission.guard';
import { OrderService } from './order.service';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';
import { OrderStatus } from './entities/order.entity';

@Controller('orders')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @Req() req) {
    return this.orderService.create(createOrderDto, req.user);
  }

  @Get()
  findAll() {
    return this.orderService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.orderService.update(id, updateOrderDto);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.orderService.updateStatus(id, status);
  }

  @Get('customer/:id')
  findByCustomer(@Param('id') customerId: string) {
    return this.orderService.findByCustomer(customerId);
  }
}
```

### 4. Módulo de Pedidos
- [ ] Criar ecommerce/src/order-service/order.module.ts:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, OrderItemEntity]),
  ],
  providers: [OrderService],
  controllers: [OrderController],
  exports: [OrderService],
})
export class OrderModule {}
```

### 5. Eventos de Pedido
- [ ] Criar ecommerce/src/order-service/events/order.events.ts:
```typescript
export class OrderCreatedEvent {
  constructor(public readonly orderId: string) {}
}

export class OrderStatusChangedEvent {
  constructor(
    public readonly orderId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string,
  ) {}
}
```

### 6. Listeners de Pedido
- [ ] Criar ecommerce/src/order-service/listeners/order.listener.ts:
```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderCreatedEvent, OrderStatusChangedEvent } from '../events/order.events';

@Injectable()
export class OrderListener {
  @OnEvent('order.created')
  handleOrderCreatedEvent(event: OrderCreatedEvent) {
    // Lógica para processar pedido criado
    console.log(`Order ${event.orderId} created`);
  }

  @OnEvent('order.status.changed')
  handleOrderStatusChangedEvent(event: OrderStatusChangedEvent) {
    // Lógica para processar mudança de status
    console.log(
      `Order ${event.orderId} status changed from ${event.oldStatus} to ${event.newStatus}`,
    );
  }
}
```

## Prompt para Agente

```markdown
### Tarefa: Implementação do Serviço de Pedidos
**Contexto**: Core implementado, agora precisamos do serviço de pedidos no ecommerce.

**Objetivo**: Criar um serviço de pedidos com suporte multi-tenant.

**Entrada**: 
- Estrutura do ecommerce package
- Core package implementado
- Requisitos:
  - CRUD de pedidos
  - Itens de pedido
  - Status e eventos
  - Integração com tenant

**Saída Esperada**:
- API de pedidos funcional
- Sistema de eventos implementado
- Integração com core
- Testes de integração passando

**Instruções**:
1. Siga o checklist na ordem apresentada
2. Implemente cada componente
3. Teste as funcionalidades
4. Valide a integração com tenant

**Validação**:
```bash
# Criar pedido
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "123",
        "name": "Product 1",
        "price": 100,
        "quantity": 2
      }
    ]
  }'

# Atualizar status
curl -X PUT http://localhost:3000/orders/{id}/status \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"status":"processing"}'

# Listar pedidos do cliente
curl -X GET http://localhost:3000/orders/customer/{customerId} \
  -H "Authorization: Bearer {token}"
``` 