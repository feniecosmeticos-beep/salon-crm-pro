# Salon CRM Pro — Schema do banco

> Última revisão: 19 de junho de 2026  
> Fonte: `supabase/migrations/001_initial_schema.sql`, `002_rls_multi_tenant.sql` e `003_audit_logs.sql`. O banco remoto não foi introspectado; este documento descreve o schema versionado no projeto.

## Visão geral

O banco usa PostgreSQL/Supabase e a extensão `pgcrypto` para gerar UUIDs com `gen_random_uuid()`.

O schema possui 12 tabelas:

1. `salons`
2. `users`
3. `clients`
4. `professionals`
5. `services`
6. `appointments`
7. `product_sales`
8. `client_metrics`
9. `follow_ups`
10. `campaigns`
11. `imports`
12. `audit_logs`

Não há views ou enums. As funções versionadas são:

- `handle_updated_at()`, usada pelos triggers de atualização;
- `current_user_salon_id()`, usada pelas policies RLS para resolver o tenant autenticado.

## Mapa de relacionamentos

```text
salons
├─ users
├─ clients
│  ├─ appointments
│  ├─ product_sales
│  ├─ client_metrics
│  └─ follow_ups
├─ professionals
│  └─ appointments
├─ services
│  └─ appointments
├─ appointments
├─ product_sales
├─ client_metrics
├─ follow_ups
├─ campaigns
├─ imports
└─ audit_logs
```

Todas as tabelas de domínio possuem `salon_id`, exceto a própria `salons`. Nas tabelas anteriores à Fase 9B esses campos ainda aceitam `NULL`; em `audit_logs`, `salon_id` é obrigatório.

## Tabelas

### `salons`

Cadastro do salão/tenant.

| Coluna | Tipo | Regras |
| --- | --- | --- |
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `name` | `text` | obrigatório |
| `phone` | `text` | opcional |
| `city` | `text` | opcional |
| `plan` | `text` | default `trial` |
| `created_at` | `timestamptz` | default `now()` |

Relacionamentos:

- pai de todas as tabelas que possuem `salon_id`;
- ao excluir um salão, os registros filhos com FK para ele são removidos em cascata.

### `users`

Usuários internos do salão.

| Coluna | Tipo | Regras |
| --- | --- | --- |
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `salon_id` | `uuid` | FK para `salons.id`; `ON DELETE CASCADE`; opcional |
| `name` | `text` | obrigatório |
| `email` | `text` | obrigatório |
| `role` | `text` | default `admin` |
| `created_at` | `timestamptz` | default `now()` |

Regras importantes:

- `id` não possui FK para `auth.users.id`;
- `email` não possui constraint de unicidade;
- `role` é texto livre.
- a resolução de tenant prefere `id = auth.uid()` e usa o e-mail do JWT somente como fallback compatível;
- e-mail duplicado sem match por ID faz o helper de tenant retornar `NULL`.

### `clients`

Cadastro principal de clientes.

| Coluna | Tipo | Regras |
| --- | --- | --- |
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `salon_id` | `uuid` | FK para `salons.id`; `ON DELETE CASCADE`; opcional |
| `avec_code` | `text` | código externo AVEC; opcional |
| `name` | `text` | obrigatório |
| `phone` | `text` | opcional |
| `mobile` | `text` | opcional |
| `email` | `text` | opcional |
| `gender` | `text` | opcional |
| `birth_date` | `date` | opcional |
| `address` | `text` | opcional |
| `city` | `text` | opcional |
| `district` | `text` | opcional |
| `registration_date` | `date` | opcional |
| `notes` | `text` | opcional |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()`; atualizado por trigger |

Relacionamentos:

- um cliente pode ter muitos atendimentos;
- um cliente pode ter muitas vendas de produtos;
- um cliente pode ter no máximo uma linha de métricas quando `client_id` não é nulo;
- um cliente pode ter muitos follow-ups.

Índices:

- `idx_clients_salon_id (salon_id)`
- `idx_clients_mobile (mobile)`
- `idx_clients_name (name)`

Não existem constraints únicas para `avec_code`, `mobile` ou `email`.

### `professionals`

Profissionais associados aos atendimentos.

| Coluna | Tipo | Regras |
| --- | --- | --- |
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `salon_id` | `uuid` | FK para `salons.id`; `ON DELETE CASCADE`; opcional |
| `name` | `text` | obrigatório |
| `active` | `boolean` | default `true` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()`; atualizado por trigger |

Relacionamentos:

- um profissional pode estar associado a muitos atendimentos;
- se o profissional for excluído, `appointments.professional_id` recebe `NULL`.

Não existe unicidade por `(salon_id, name)`.

### `services`

Catálogo de serviços do salão.

| Coluna | Tipo | Regras |
| --- | --- | --- |
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `salon_id` | `uuid` | FK para `salons.id`; `ON DELETE CASCADE`; opcional |
| `name` | `text` | obrigatório |
| `category` | `text` | opcional |
| `standard_price` | `numeric(12,2)` | default `0` |
| `active` | `boolean` | default `true` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()`; atualizado por trigger |

Relacionamentos:

- um serviço pode estar associado a muitos atendimentos;
- se o serviço for excluído, `appointments.service_id` recebe `NULL`.

Não existe unicidade por `(salon_id, name)`.

### `appointments`

Histórico de serviços realizados.

| Coluna | Tipo | Regras |
| --- | --- | --- |
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `salon_id` | `uuid` | FK para `salons.id`; `ON DELETE CASCADE`; opcional |
| `client_id` | `uuid` | FK para `clients.id`; `ON DELETE SET NULL`; opcional |
| `professional_id` | `uuid` | FK para `professionals.id`; `ON DELETE SET NULL`; opcional |
| `service_id` | `uuid` | FK para `services.id`; `ON DELETE SET NULL`; opcional |
| `appointment_date` | `date` | obrigatório |
| `gross_value` | `numeric(12,2)` | default `0` |
| `discount_value` | `numeric(12,2)` | default `0` |
| `total_value` | `numeric(12,2)` | default `0` |
| `import_source` | `text` | opcional; importação AVEC grava `avec` |
| `created_at` | `timestamptz` | default `now()` |

Índices:

- `idx_appointments_salon_id (salon_id)`
- `idx_appointments_client_id (client_id)`
- `idx_appointments_appointment_date (appointment_date)`

A assinatura usada pela aplicação para procurar duplicatas é:

```text
salon_id + client_id + service_id + appointment_date + total_value + professional_id
```

Essa assinatura não possui constraint única no banco.

### `product_sales`

Histórico de produtos vendidos.

| Coluna | Tipo | Regras |
| --- | --- | --- |
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `salon_id` | `uuid` | FK para `salons.id`; `ON DELETE CASCADE`; opcional |
| `client_id` | `uuid` | FK para `clients.id`; `ON DELETE SET NULL`; opcional |
| `product_name` | `text` | obrigatório |
| `brand` | `text` | opcional |
| `category` | `text` | opcional |
| `quantity` | `numeric(12,2)` | default `1` |
| `unit_value` | `numeric(12,2)` | default `0` |
| `total_value` | `numeric(12,2)` | default `0` |
| `sale_date` | `date` | opcional |
| `created_at` | `timestamptz` | default `now()` |

Índices:

- `idx_product_sales_salon_id (salon_id)`
- `idx_product_sales_client_id (client_id)`
- `idx_product_sales_sale_date (sale_date)`

A assinatura usada pela aplicação para procurar duplicatas é:

```text
salon_id + client_id + product_name + sale_date + total_value
```

Essa assinatura não possui constraint única no banco.

### `client_metrics`

Resumo comercial calculado por cliente.

| Coluna | Tipo | Regras |
| --- | --- | --- |
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `salon_id` | `uuid` | FK para `salons.id`; `ON DELETE CASCADE`; opcional |
| `client_id` | `uuid` | FK para `clients.id`; `ON DELETE CASCADE`; opcional; unique |
| `last_visit` | `date` | opcional |
| `total_visits` | `integer` | default `0` |
| `total_service_spent` | `numeric(12,2)` | default `0` |
| `total_product_spent` | `numeric(12,2)` | default `0` |
| `total_spent` | `numeric(12,2)` | default `0` |
| `average_ticket` | `numeric(12,2)` | default `0` |
| `days_without_visit` | `integer` | default `0` |
| `client_status` | `text` | default `Sem histórico` |
| `client_level` | `text` | default `Bronze` |
| `buys_products` | `boolean` | default `false` |
| `updated_at` | `timestamptz` | default `now()`; atualizado explicitamente pelo recalculo da aplicação |

Constraint:

- `client_metrics_client_id_key UNIQUE (client_id)`

Índices:

- `idx_client_metrics_salon_id (salon_id)`
- `idx_client_metrics_client_status (client_status)`
- `idx_client_metrics_client_level (client_level)`

Valores usados pela aplicação:

- status: `Novo`, `Ativo`, `Em risco`, `Inativo`, `Sem histórico`;
- nível: `Diamante`, `Ouro`, `Prata`, `Bronze`.

Esses valores não são restringidos pelo banco.

### `follow_ups`

Tarefas ou sugestões de acompanhamento comercial.

| Coluna | Tipo | Regras |
| --- | --- | --- |
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `salon_id` | `uuid` | FK para `salons.id`; `ON DELETE CASCADE`; opcional |
| `client_id` | `uuid` | FK para `clients.id`; `ON DELETE CASCADE`; opcional |
| `type` | `text` | opcional |
| `title` | `text` | obrigatório |
| `suggested_message` | `text` | opcional |
| `suggested_date` | `date` | opcional |
| `status` | `text` | default `pending` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()`; atualizado por trigger |

Índices:

- `idx_follow_ups_salon_id (salon_id)`
- `idx_follow_ups_status (status)`
- `idx_follow_ups_suggested_date (suggested_date)`

Valores tipados na aplicação para `status`:

- `pending`
- `done`
- `cancelled`

Não existe constraint SQL para restringir esses valores.

### `campaigns`

Definições de campanhas comerciais.

| Coluna | Tipo | Regras |
| --- | --- | --- |
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `salon_id` | `uuid` | FK para `salons.id`; `ON DELETE CASCADE`; opcional |
| `name` | `text` | obrigatório |
| `segment` | `text` | opcional |
| `message` | `text` | opcional |
| `active` | `boolean` | default `true` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()`; atualizado por trigger |

A tabela existe e recebe dados no seed, mas ainda não possui serviço ou fluxo de interface funcional.

### `imports`

Log resumido das importações.

| Coluna | Tipo | Regras |
| --- | --- | --- |
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `salon_id` | `uuid` | FK para `salons.id`; `ON DELETE CASCADE`; opcional |
| `file_type` | `text` | obrigatório |
| `file_name` | `text` | obrigatório |
| `total_rows` | `integer` | default `0` |
| `imported_rows` | `integer` | default `0` |
| `failed_rows` | `integer` | default `0` |
| `status` | `text` | default `pending` |
| `imported_at` | `timestamptz` | default `now()` |

Status gravados pelo fluxo atual:

- `completed`
- `completed_with_errors`
- `failed`

O default `pending` existe no banco, mas o fluxo atual insere o status final diretamente.

### `audit_logs`

Registro append-only de ações relevantes dos usuários internos.

| Coluna | Tipo | Regras |
| --- | --- | --- |
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `salon_id` | `uuid` | obrigatório; FK para `salons.id`; `ON DELETE CASCADE` |
| `user_id` | `uuid` | opcional; FK para `users.id`; `ON DELETE SET NULL` |
| `user_email` | `text` | snapshot opcional do e-mail |
| `action` | `text` | obrigatório |
| `entity_type` | `text` | opcional |
| `entity_id` | `uuid` | opcional |
| `metadata` | `jsonb` | default `{}` |
| `ip_address` | `text` | opcional |
| `user_agent` | `text` | opcional |
| `created_at` | `timestamptz` | default `now()` |

A aplicação registra importações concluídas, alterações do salão, mudanças de função, criação/conclusão/reabertura de follow-ups e tentativas prioritárias bloqueadas por permissão.

## Índices consolidados

| Índice | Tabela | Coluna |
| --- | --- | --- |
| `idx_clients_salon_id` | `clients` | `salon_id` |
| `idx_clients_mobile` | `clients` | `mobile` |
| `idx_clients_name` | `clients` | `name` |
| `idx_appointments_salon_id` | `appointments` | `salon_id` |
| `idx_appointments_client_id` | `appointments` | `client_id` |
| `idx_appointments_appointment_date` | `appointments` | `appointment_date` |
| `idx_product_sales_salon_id` | `product_sales` | `salon_id` |
| `idx_product_sales_client_id` | `product_sales` | `client_id` |
| `idx_product_sales_sale_date` | `product_sales` | `sale_date` |
| `idx_client_metrics_salon_id` | `client_metrics` | `salon_id` |
| `idx_client_metrics_client_status` | `client_metrics` | `client_status` |
| `idx_client_metrics_client_level` | `client_metrics` | `client_level` |
| `idx_follow_ups_salon_id` | `follow_ups` | `salon_id` |
| `idx_follow_ups_status` | `follow_ups` | `status` |
| `idx_follow_ups_suggested_date` | `follow_ups` | `suggested_date` |
| `idx_audit_logs_salon_id` | `audit_logs` | `salon_id` |
| `idx_audit_logs_user_id` | `audit_logs` | `user_id` |
| `idx_audit_logs_action` | `audit_logs` | `action` |
| `idx_audit_logs_created_at` | `audit_logs` | `created_at` |

Além desses índices, PostgreSQL cria automaticamente índices para as chaves primárias e para a constraint única de `client_metrics.client_id`.

## Triggers

A função `handle_updated_at()` substitui `updated_at` por `now()` antes de cada update.

Triggers existentes:

- `set_clients_updated_at`
- `set_professionals_updated_at`
- `set_services_updated_at`
- `set_follow_ups_updated_at`
- `set_campaigns_updated_at`

Não há trigger de `updated_at` em `client_metrics`. A atualização feita pela aplicação também não envia explicitamente um novo `updated_at`.

## Row Level Security

RLS está habilitada em todas as 12 tabelas.

### Função `current_user_salon_id()`

A migration `002_rls_multi_tenant.sql` cria:

```sql
public.current_user_salon_id() returns uuid
```

Comportamento:

1. tenta localizar `public.users.id = auth.uid()`;
2. se não houver vínculo por ID, compara `lower(public.users.email)` com o e-mail de `auth.jwt()`;
3. o fallback por e-mail só é aceito quando existe exatamente uma linha correspondente;
4. vínculo ausente, duplicado ou com `salon_id` nulo retorna `NULL`.

A função é `STABLE` e `SECURITY DEFINER` para consultar `public.users` sem recursão das próprias policies dessa tabela. O `search_path` é restrito a `pg_catalog`, todos os objetos são qualificados por schema, o privilégio público é revogado e somente `authenticated` recebe `EXECUTE`.

### Policies das tabelas com `salon_id`

As policies permissivas da migration inicial são removidas. Para `users`, `clients`, `professionals`, `services`, `appointments`, `product_sales`, `client_metrics`, `follow_ups`, `campaigns` e `imports`, a regra é:

| Operação | Regra |
| --- | --- |
| `SELECT` | `USING (salon_id = current_user_salon_id())` |
| `INSERT` | `WITH CHECK (salon_id = current_user_salon_id())` |
| `UPDATE` | `USING` e `WITH CHECK` com o salão atual |
| `DELETE` | `USING (salon_id = current_user_salon_id())` |

Como uma comparação com `NULL` não é verdadeira, usuários sem vínculo não enxergam nem alteram linhas.

### Policies de `audit_logs`

- `SELECT`: somente logs com `salon_id = current_user_salon_id()`;
- `INSERT`: somente quando o novo log pertence ao salão atual;
- não existem policies autenticadas de `UPDATE` ou `DELETE`;
- a service role mantém compatibilidade para os registros server-side e continua sujeita à validação de sessão, usuário e tenant feita pela aplicação.

### Policies de `salons`

- `SELECT`: somente quando `id = current_user_salon_id()`;
- `UPDATE`: somente o salão atual, com `USING` e `WITH CHECK`;
- não existem policies autenticadas de `INSERT` ou `DELETE`.

### Service role

Os serviços server-side atuais usam `SUPABASE_SERVICE_ROLE_KEY`, que ignora RLS. A importação e o service de auditoria continuam funcionando por esse mecanismo, mas resolvem sessão, usuário e salão antes da persistência. Os filtros explícitos por `salon_id` permanecem como defesa da aplicação.

### Aplicação da migration

Em um projeto vinculado pela Supabase CLI:

```powershell
supabase.cmd db push --dry-run
supabase.cmd db push
supabase.cmd migration list
```

O `--dry-run` permite conferir as migrations pendentes antes da aplicação remota.

### Teste manual com dois salões

1. Crie Salão A e Salão B.
2. Crie Usuário Auth A e Usuário Auth B.
3. Crie as linhas correspondentes em `public.users`, ligando A ao Salão A e B ao Salão B.
4. Insira dados identificáveis em ambos os salões.
5. Consulte o Data API com o JWT de A: apenas dados do Salão A devem aparecer.
6. Consulte com o JWT de B: apenas dados do Salão B devem aparecer.
7. Tente inserir ou alterar, com o JWT de A, uma linha cujo `salon_id` seja o do Salão B: a operação deve falhar.
8. Use um JWT válido sem registro em `public.users`: leituras devem ficar vazias e escritas devem falhar.

## Regras de exclusão

| Relacionamento | Regra |
| --- | --- |
| salão → registros do salão | `ON DELETE CASCADE` |
| usuário → logs de auditoria | `ON DELETE SET NULL` |
| cliente → métricas | `ON DELETE CASCADE` |
| cliente → follow-ups | `ON DELETE CASCADE` |
| cliente → atendimentos | `ON DELETE SET NULL` |
| cliente → vendas de produtos | `ON DELETE SET NULL` |
| profissional → atendimentos | `ON DELETE SET NULL` |
| serviço → atendimentos | `ON DELETE SET NULL` |

## Regras de negócio calculadas na aplicação

As métricas não são calculadas por trigger ou função SQL. Elas são recalculadas no servidor após importações de clientes, clientes atendidos, atendimentos ou produtos.

As regras oficiais e seus casos de borda estão em [client-metrics-rules.md](./client-metrics-rules.md).

### Status do cliente

| Condição | Status |
| --- | --- |
| sem última visita ou zero visitas | `Sem histórico` |
| uma visita e até 30 dias sem visitar | `Novo` |
| até 45 dias sem visitar, nos demais casos | `Ativo` |
| de 46 a 89 dias sem visitar | `Em risco` |
| 90 dias ou mais sem visitar | `Inativo` |

### Nível do cliente

| Condição | Nível |
| --- | --- |
| gasto maior ou igual a R$ 3.000 ou mais de 15 visitas | `Diamante` |
| gasto maior ou igual a R$ 1.500 ou mais de 10 visitas | `Ouro` |
| gasto maior ou igual a R$ 700 ou mais de 5 visitas | `Prata` |
| demais casos | `Bronze` |

As condições são avaliadas da faixa mais alta para a mais baixa, sem lacunas monetárias.

## Pontos de atenção para evolução

1. Tornar `salon_id` obrigatório nas tabelas de domínio.
2. Criar vínculo estrutural direto entre `users` e `auth.users`.
3. Aplicar e homologar a migration RLS no banco remoto.
4. Filtrar todas as consultas e mutações por `salon_id`.
5. Adicionar constraints de unicidade alinhadas à deduplicação.
6. Adicionar `CHECK` ou enums para status e níveis.
7. Gerar tipos TypeScript pelo Supabase.
8. Considerar constraints que impeçam referências cruzadas entre salões.
9. Adicionar índices de `salon_id` em `users`, `professionals`, `services`, `campaigns` e `imports` conforme o volume e as consultas futuras.
10. Definir retenção, arquivamento e proteção administrativa para auditoria em uma fase futura.
