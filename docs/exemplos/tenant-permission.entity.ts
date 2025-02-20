/**
 * @file docs/exemplos/tenant-permission.entity.ts
 * @description Entidade para gerenciamento de permissões por tenant.
 * Implementa o sistema híbrido de permissões, permitindo definir
 * recursos, ações e condições de acesso específicas para cada tenant.
 * Integra com o sistema de roles e superAdmin para controle granular.
 */

import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { TenantEntity } from './tenant.entity';

/**
 * Entidade de permissão de tenant
 * @description Representa uma permissão associada a um tenant
 */
@Entity('tenant_permissions')
export class TenantPermissionEntity extends BaseEntity {
  @Column({ name: 'resource' })
  resource: string;

  @Column('json', { name: 'actions', default: [] })
  actions: string[];

  @Column('json', { name: 'conditions', default: {} })
  conditions: Record<string, any>;

  @Column({ name: 'description', nullable: true })
  description?: string;

  @ManyToOne(() => TenantEntity, tenant => tenant.permissions)
  tenant: TenantEntity;

  /**
   * Verifica se a permissão tem uma ação específica
   */
  hasAction(action: string): boolean {
    return this.actions.includes(action);
  }

  /**
   * Verifica se a permissão atende a uma condição
   */
  meetsCondition(condition: string, value: any): boolean {
    return this.conditions[condition] === value;
  }
} 