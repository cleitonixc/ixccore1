/**
 * @file docs/exemplos/user.entity.ts
 * @description Entidade de usuário que implementa o modelo de dados para autenticação e perfil.
 * Inclui campos para autenticação (email, senha), perfil básico, controle de acesso (roles, isSuperAdmin)
 * e integração com o sistema multi-tenant.
 */

import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Entidade de usuário do sistema
 * @description Representa um usuário com autenticação e permissões
 */
@Entity('users')
export class UserEntity extends BaseEntity {
  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'email', unique: true })
  email: string;

  @Column({ name: 'password' })
  password: string;

  @Column({ name: 'phone', nullable: true })
  phone?: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @Column({ name: 'is_super_admin', default: false })
  isSuperAdmin: boolean;

  @Column('json', { name: 'roles', default: [] })
  roles: string[];

  @Column('json', { name: 'preferences', default: {} })
  preferences: Record<string, any>;

  /**
   * Retorna o nome completo do usuário
   */
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Verifica se o usuário tem uma role específica
   */
  hasRole(role: string): boolean {
    return this.roles.includes(role);
  }
} 