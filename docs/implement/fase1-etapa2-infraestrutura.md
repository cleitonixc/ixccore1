# Fase 1 - Etapa 2: Configuração de Infraestrutura Compartilhada

## Objetivo
Implementar módulos de infraestrutura compartilhada para banco de dados, cache e filas.

## Pré-requisitos
- [x] Etapa 1 concluída
- [x] Docker instalado
- [x] Docker Compose instalado

## Checklist

### 1. Configuração do Ambiente Docker
- [x] Criar docker-compose.yml
- [x] Configurar serviço PostgreSQL
- [x] Configurar serviço Redis
- [x] Configurar serviço RabbitMQ
- [x] Configurar serviço Jaeger
- [x] Definir volumes persistentes

### 2. Módulo de Banco de Dados
- [x] Instalar dependências TypeORM
- [x] Configurar DatabaseModule
- [ ] Implementar migrations iniciais
- [ ] Criar scripts de seed para testes

### 3. Módulo de Cache
- [x] Instalar dependências Redis
- [x] Configurar CacheModule
- [x] Implementar estratégia de cache por tenant
- [x] Adicionar testes de integração

### 4. Módulo de Filas
- [x] Instalar dependências RabbitMQ
- [x] Configurar QueueModule
- [x] Implementar producers e consumers base
- [x] Adicionar testes de integração

### 5. Módulo de Métricas
- [x] Instalar dependências Prometheus
- [x] Configurar MetricsModule
- [ ] Implementar métricas personalizadas
- [ ] Configurar dashboards Grafana

### 6. Módulo de Telemetria
- [x] Instalar dependências OpenTelemetry
- [x] Configurar TelemetryModule
- [ ] Implementar rastreamento personalizado
- [ ] Configurar visualizações Jaeger

### 7. Configuração de Variáveis de Ambiente
- [x] Criar .env.example
- [x] Criar .env
- [x] Documentar todas as variáveis
- [x] Implementar validação de configuração

### 8. Módulo de Configuração
- [x] Instalar dependências
- [x] Configurar ConfigModule
- [x] Implementar validação de schema
- [x] Adicionar testes unitários

### 9. Módulo de Infraestrutura
- [x] Criar InfrastructureModule
- [x] Integrar todos os módulos
- [x] Implementar health checks
- [x] Adicionar testes de integração

### 10. Documentação
- [x] Atualizar README.md
- [ ] Documentar arquitetura
- [ ] Criar guia de desenvolvimento
- [ ] Documentar procedimentos de deploy

### 11. CI/CD
- [ ] Configurar GitHub Actions
- [ ] Implementar pipeline de testes
- [ ] Configurar build automatizado
- [ ] Implementar deploy automatizado

### 12. Monitoramento
- [x] Configurar logs centralizados
- [ ] Implementar alertas
- [ ] Configurar monitoramento de performance
- [ ] Criar dashboards de observabilidade

## Prompt para Agente

```markdown
### Tarefa: Configuração da Infraestrutura Compartilhada
**Contexto**: Monorepo configurado, precisamos implementar a infraestrutura base.

**Objetivo**: Configurar módulos de banco de dados, cache e filas com suporte multi-tenant.

**Entrada**: 
- Estrutura do monorepo da Etapa 1
- Requisitos de infraestrutura:
  - PostgreSQL com schemas por tenant
  - Redis com prefixos por tenant
  - RabbitMQ com filas por tenant

**Saída Esperada**:
- Docker Compose funcional
- Módulos de infraestrutura configurados
- Variáveis de ambiente definidas
- Testes de conexão passando

**Instruções**:
1. Siga o checklist na ordem apresentada
2. Teste cada serviço após configuração
3. Valide o suporte multi-tenant
4. Documente quaisquer ajustes necessários

**Validação**:
```bash
# Inicie os serviços
docker-compose up -d

# Teste as conexões
pnpm test:e2e

# Verifique logs
docker-compose logs

# Teste multi-tenant
curl -X POST http://localhost:3000/tenant/test
``` 