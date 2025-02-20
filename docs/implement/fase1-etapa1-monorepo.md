# Fase 1 - Etapa 1: Configuração do Monorepo

## Objetivo
Configurar a estrutura base do monorepo com os pacotes core/, ecommerce/ e chat/.

## Pré-requisitos
- Node.js >= 18
- pnpm instalado globalmente
- NestJS CLI instalado globalmente

## Checklist

### 1. Estrutura Base
- [x] Criar diretório raiz do projeto
- [x] Inicializar git
- [x] Criar .gitignore com node_modules, dist, .env
- [x] Criar README.md com descrição do projeto

### 2. Configuração do Monorepo
- [x] Criar package.json raiz:
```json
{
  "name": "ixccore",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "dev": "pnpm -r dev"
  }
}
```

### 3. Configuração TypeScript
- [x] Criar tsconfig.json base:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "es2017",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "paths": {
      "@ixccore/core/*": ["packages/core/src/*"],
      "@ixccore/ecommerce/*": ["packages/ecommerce/src/*"],
      "@ixccore/chat/*": ["packages/chat/src/*"]
    }
  }
}
```

### 4. Inicialização dos Pacotes
- [x] Criar diretório packages/
- [x] Para cada pacote (core, ecommerce, chat):
  - [x] Criar projeto NestJS: `nest new @ixccore/[pacote] --package-manager pnpm`
  - [x] Ajustar package.json com nome e dependências
  - [x] Configurar tsconfig.json estendendo o base
  - [x] Criar estrutura de pastas src/

### 5. Dependências Comuns
- [x] Instalar dependências de desenvolvimento:
```bash
pnpm add -D @types/node typescript @nestjs/cli rimraf
```
- [x] Instalar dependências de produção:
```bash
pnpm add @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata
```

### 6. Scripts de Desenvolvimento
- [x] Configurar scripts em cada package.json:
```json
{
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\"",
    "start": "nest start",
    "dev": "nest start --watch",
    "debug": "nest start --debug --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### 7. Configurações Adicionais (Novo)
- [x] Configurar Docker com docker-compose.yml
- [x] Configurar variáveis de ambiente (.env)
- [x] Configurar pnpm-workspace.yaml

### 8. Validação da Estrutura (Novo)
- [x] Executar build completo do monorepo
- [x] Executar testes em todos os pacotes
- [x] Verificar integração entre pacotes
- [x] Testar scripts de desenvolvimento

## Status Final
✅ Todos os testes passaram com sucesso:
- Build completado em todos os pacotes
- Testes unitários passando
- Verificação de tipos TypeScript ok
- Integração entre pacotes funcionando

## Prompt para Agente

```markdown
### Tarefa: Configuração Inicial do Monorepo
**Contexto**: Início do projeto, precisamos configurar a estrutura base do monorepo.

**Objetivo**: Criar a estrutura de pastas e arquivos de configuração para um monorepo NestJS.

**Entrada**: 
- Nome do projeto: ixccore
- Pacotes: core, ecommerce, chat
- Gerenciador de pacotes: pnpm
- Framework: NestJS

**Saída Esperada**:
- Estrutura de pastas completa
- Arquivos de configuração (package.json, tsconfig.json)
- Projetos NestJS inicializados
- Dependências instaladas

**Instruções**:
1. Siga o checklist fornecido na ordem apresentada
2. Valide cada passo antes de prosseguir
3. Mantenha logs de cada ação executada
4. Reporte quaisquer erros ou inconsistências

**Validação**:
```bash
# Teste a estrutura
pnpm install
pnpm build
pnpm test

# Verifique se os módulos são encontrados
pnpm -r exec tsc --noEmit
``` 