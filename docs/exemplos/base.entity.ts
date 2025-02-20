/**
 * @file docs/exemplos/base.entity.ts
 * @description Entidade base que fornece campos comuns para todas as entidades do sistema.
 * Implementa campos de auditoria, identificação e metadados que são herdados por outras entidades.
 * Deve ser usada como classe base para todas as entidades do sistema.
 */

import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from 'typeorm';

/**
 * Entidade base com campos comuns para todas as entidades
 * @description Fornece campos de auditoria e identificação padrão
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'deleted_by', nullable: true })
  deletedBy?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column('json', { name: 'metadata', default: {} })
  metadata: Record<string, any>;
} 