/**
 * @file docs/exemplos/service.example.ts
 * @description Serviço base com padrões comuns de CRUD e validação.
 * Implementa operações básicas com suporte a multi-tenant, cache e eventos.
 * Serve como base para implementação de serviços específicos.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Serviço base genérico
 * @description Implementa operações CRUD com suporte multi-tenant
 */
@Injectable()
export class BaseService<T extends BaseEntity> {
  constructor(
    @InjectRepository(BaseEntity)
    private readonly repository: Repository<T>,
    private readonly eventEmitter: any,
    private readonly cacheService: any,
  ) {}

  /**
   * Cria uma nova entidade
   */
  async create(data: Partial<T>, tenantId: string, userId: string): Promise<T> {
    const entity = this.repository.create({
      ...data,
      tenantId,
      createdBy: userId,
    });

    await this.repository.save(entity);
    await this.cacheService.invalidate(`${tenantId}:list`);
    this.eventEmitter.emit('entity.created', { entity, tenantId, userId });

    return entity;
  }

  /**
   * Busca uma entidade por ID
   */
  async findOne(id: string, tenantId: string): Promise<T> {
    const cached = await this.cacheService.get(`${tenantId}:${id}`);
    if (cached) return cached;

    const entity = await this.repository.findOne({
      where: { id, tenantId },
    });

    if (!entity) {
      throw new NotFoundException(`Entity ${id} not found`);
    }

    await this.cacheService.set(`${tenantId}:${id}`, entity);
    return entity;
  }

  /**
   * Lista entidades com paginação
   */
  async findAll(tenantId: string, page = 1, limit = 10): Promise<[T[], number]> {
    const cached = await this.cacheService.get(`${tenantId}:list:${page}`);
    if (cached) return cached;

    const [entities, total] = await this.repository.findAndCount({
      where: { tenantId },
      skip: (page - 1) * limit,
      take: limit,
    });

    await this.cacheService.set(`${tenantId}:list:${page}`, [entities, total]);
    return [entities, total];
  }

  /**
   * Atualiza uma entidade
   */
  async update(
    id: string,
    data: Partial<T>,
    tenantId: string,
    userId: string,
  ): Promise<T> {
    const entity = await this.findOne(id, tenantId);
    const updated = this.repository.merge(entity, {
      ...data,
      updatedBy: userId,
    });

    await this.repository.save(updated);
    await this.cacheService.invalidate(`${tenantId}:${id}`);
    await this.cacheService.invalidate(`${tenantId}:list`);
    this.eventEmitter.emit('entity.updated', { entity: updated, tenantId, userId });

    return updated;
  }

  /**
   * Remove uma entidade (soft delete)
   */
  async remove(id: string, tenantId: string, userId: string): Promise<void> {
    const entity = await this.findOne(id, tenantId);
    entity.deletedBy = userId;
    
    await this.repository.softRemove(entity);
    await this.cacheService.invalidate(`${tenantId}:${id}`);
    await this.cacheService.invalidate(`${tenantId}:list`);
    this.eventEmitter.emit('entity.deleted', { entity, tenantId, userId });
  }
} 