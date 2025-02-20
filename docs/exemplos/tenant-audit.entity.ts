/**
 * @file docs/exemplos/tenant-audit.entity.ts
 * @description Entidade para registro de auditoria de ações em tenants.
 * Implementa logging estruturado de todas as operações realizadas em tenants,
 * incluindo criação, modificação, acesso e alterações de permissões.
 * Especialmente importante para tracking de ações de superAdmins.
 */

import { Entity, Column, CreateDateColumn } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Entidade de auditoria de tenant
 * @description Registra ações realizadas em tenants
 */
@Entity('tenant_audit_logs')
export class TenantAuditEntity extends BaseEntity {
  @Column({ name: 'action' })
  action: string;

  @Column({ name: 'resource_type' })
  resourceType: string;

  @Column({ name: 'resource_id' })
  resourceId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'is_super_admin' })
  isSuperAdmin: boolean;

  @Column('json', { name: 'previous_state', nullable: true })
  previousState?: Record<string, any>;

  @Column('json', { name: 'new_state', nullable: true })
  newState?: Record<string, any>;

  @Column('json', { name: 'changes' })
  changes: Record<string, any>;

  @Column('json', { name: 'context', default: {} })
  context: Record<string, any>;

  /**
   * Retorna as mudanças em formato legível
   */
  getChangesDescription(): string {
    return Object.entries(this.changes)
      .map(([key, value]) => `${key}: ${value.from} -> ${value.to}`)
      .join(', ');
  }

  /**
   * Verifica se houve mudança em um campo específico
   */
  hasFieldChanged(field: string): boolean {
    return field in this.changes;
  }
} 