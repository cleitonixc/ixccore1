/**
 * @file docs/exemplos/tenant.entity.ts
 * @description Entidade principal para gerenciamento de tenants no sistema.
 * Implementa o modelo de dados para multi-tenancy, incluindo configurações,
 * schema, permissões e metadados específicos de cada tenant.
 * Base para o sistema de isolamento e controle de acesso por tenant.
 */

import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { TenantPermissionEntity } from './tenant-permission.entity';

/**
 * Entidade de tenant do sistema
 * @description Representa um tenant com suas configurações e permissões
 */
@Entity('tenants')
export class TenantEntity extends BaseEntity {
  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'slug', unique: true })
  slug: string;

  @Column({ name: 'schema_name', unique: true })
  schemaName: string;

  @Column({ name: 'domain', unique: true })
  domain: string;

  @Column({ name: 'description', nullable: true })
  description?: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl?: string;

  @Column({ name: 'primary_color', default: '#000000' })
  primaryColor: string;

  @Column('json', { name: 'settings', default: {} })
  settings: Record<string, any>;

  @Column('json', { name: 'features', default: [] })
  features: string[];

  @OneToMany(() => TenantPermissionEntity, permission => permission.tenant)
  permissions: TenantPermissionEntity[];

  /**
   * Verifica se o tenant tem uma feature específica
   */
  hasFeature(feature: string): boolean {
    return this.features.includes(feature);
  }

  /**
   * Retorna as configurações de um módulo específico
   */
  getModuleSettings(module: string): Record<string, any> {
    return this.settings[module] || {};
  }
} 