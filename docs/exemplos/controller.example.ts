/**
 * @file docs/exemplos/controller.example.ts
 * @description Controller base com endpoints REST padrão.
 * Implementa operações CRUD com validação, documentação e segurança.
 * Serve como base para implementação de controllers específicos.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { BaseService } from './service.example';
import { BaseEntity } from './base.entity';
import { AuthGuard } from './auth.guard';
import { ObservabilityInterceptor } from './interceptor.example';

/**
 * Controller base genérico
 * @description Implementa endpoints REST com suporte multi-tenant
 */
@Controller('resource')
@UseGuards(AuthGuard)
@UseInterceptors(ObservabilityInterceptor)
export class BaseController<T extends BaseEntity> {
  constructor(private readonly service: BaseService<T>) {}

  /**
   * Cria um novo recurso
   */
  @Post()
  async create(@Body() data: Partial<T>, @Req() req: any): Promise<T> {
    const { tenantId, id: userId } = req.user;
    return this.service.create(data, tenantId, userId);
  }

  /**
   * Busca um recurso por ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any): Promise<T> {
    const { tenantId } = req.user;
    return this.service.findOne(id, tenantId);
  }

  /**
   * Lista recursos com paginação
   */
  @Get()
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Req() req: any,
  ): Promise<{ data: T[]; total: number }> {
    const { tenantId } = req.user;
    const [data, total] = await this.service.findAll(tenantId, page, limit);
    return { data, total };
  }

  /**
   * Atualiza um recurso
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Partial<T>,
    @Req() req: any,
  ): Promise<T> {
    const { tenantId, id: userId } = req.user;
    return this.service.update(id, data, tenantId, userId);
  }

  /**
   * Remove um recurso
   */
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any): Promise<void> {
    const { tenantId, id: userId } = req.user;
    return this.service.remove(id, tenantId, userId);
  }
} 