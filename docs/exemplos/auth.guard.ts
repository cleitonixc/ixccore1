/**
 * @file docs/exemplos/auth.guard.ts
 * @description Guard de autenticação que implementa a validação de JWT e controle de acesso.
 * Responsável por validar tokens, extrair claims e garantir que apenas usuários autenticados
 * acessem rotas protegidas. Integra com o sistema multi-tenant para validação de acesso por tenant.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * Guard base para autenticação
 * @description Valida tokens JWT e aplica regras de autenticação
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  /**
   * Valida se a requisição pode prosseguir
   * @param context Contexto da execução
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token não fornecido');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }

  /**
   * Extrai o token do header da requisição
   * @param request Request do Express
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
} 