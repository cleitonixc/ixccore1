/**
 * @file docs/exemplos/module.example.ts
 * @description Módulo base com configuração padrão.
 * Implementa estrutura modular com providers, controllers e imports.
 * Serve como base para implementação de módulos específicos.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BaseController } from './controller.example';
import { BaseService } from './service.example';
import { BaseEntity } from './base.entity';
import { ObservabilityInterceptor } from './interceptor.example';

/**
 * Módulo base genérico
 * @description Configura estrutura modular com suporte multi-tenant
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([BaseEntity]),
    // Outros módulos necessários
  ],
  controllers: [BaseController],
  providers: [
    BaseService,
    ObservabilityInterceptor,
    // Providers adicionais
    {
      provide: 'CACHE_SERVICE',
      useFactory: () => ({
        get: async (key: string) => null,
        set: async (key: string, value: any) => {},
        invalidate: async (key: string) => {},
      }),
    },
    {
      provide: 'EVENT_EMITTER',
      useFactory: () => ({
        emit: (event: string, payload: any) => {},
      }),
    },
  ],
  exports: [BaseService],
})
export class BaseModule {} 