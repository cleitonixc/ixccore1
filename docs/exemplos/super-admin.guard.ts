/**
 * @file docs/exemplos/super-admin.guard.ts
 * @description Guard específico para validação de acesso de super administradores.
 * Implementa lógica para verificar se o usuário tem privilégios de superAdmin,
 * permitindo acesso irrestrito a recursos e bypass de validações por tenant.
 * Inclui auditoria de ações realizadas por superAdmins.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Guard para validação de superAdmin
 * @description Verifica se o usuário tem permissões de superAdmin
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Valida se o usuário é superAdmin
   * @param context Contexto da execução
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    if (!user.isSuperAdmin) {
      throw new ForbiddenException('Acesso restrito a superAdmin');
    }

    return true;
  }
} 