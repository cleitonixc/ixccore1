# IXCCore Platform

Monorepo da plataforma IXCCore contendo os módulos core, ecommerce e chat.

## Estrutura

```
packages/
  ├── core/         # Módulo core com funcionalidades base
  ├── ecommerce/    # Módulo de e-commerce
  └── chat/         # Módulo de chat
```

## Requisitos

- Node.js >= 18
- pnpm instalado globalmente
- NestJS CLI instalado globalmente

## Instalação

```bash
# Instalar dependências
pnpm install

# Build de todos os pacotes
pnpm build

# Rodar testes
pnpm test
```

## Desenvolvimento

```bash
# Rodar todos os módulos em modo desenvolvimento
pnpm dev

# Rodar um módulo específico
cd packages/[modulo]
pnpm dev
```

## Scripts Disponíveis

- `pnpm build`: Build de todos os pacotes
- `pnpm test`: Roda os testes de todos os pacotes
- `pnpm dev`: Inicia todos os pacotes em modo desenvolvimento

## Licença

UNLICENSED - Todos os direitos reservados
