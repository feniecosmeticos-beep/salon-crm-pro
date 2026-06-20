# Salon CRM Pro — Configuração do Supabase

> Última revisão: 19 de junho de 2026

## 1. Criar o projeto

1. Crie um projeto no Supabase.
2. Defina região, senha forte do banco e política de backups adequada.
3. Separe projetos de homologação e produção.
4. Obtenha URL, publishable key e service role.

Consulte [ENVIRONMENT.md](ENVIRONMENT.md) antes de copiar qualquer segredo.

## 2. Aplicar migrations

Arquivos:

```text
supabase/migrations/
├─ 001_initial_schema.sql
├─ 002_rls_multi_tenant.sql
└─ 003_audit_logs.sql
```

### Com Supabase CLI

```powershell
supabase.cmd init
supabase.cmd login
supabase.cmd link --project-ref <PROJECT_REF>
supabase.cmd db push --dry-run
supabase.cmd db push
supabase.cmd migration list
```

Confirme que as três migrations aparecem aplicadas e na ordem correta.

O `init` é necessário neste checkout porque `supabase/config.toml` ainda não está versionado.

### Pelo SQL Editor

Execute o conteúdo de cada arquivo separadamente, em ordem. Interrompa se qualquer etapa falhar.

Não modifique migrations já aplicadas em um ambiente compartilhado.

## 3. Seed

O seed cria dados fictícios do Salão Modelo, mas não cria usuários Auth.

### Local

O repositório ainda não possui `supabase/config.toml`. Para usar a stack local:

```powershell
supabase.cmd init
supabase.cmd start
supabase.cmd db reset
```

Revise qualquer configuração gerada antes de versioná-la.

### Homologação remota

Execute `supabase/seed.sql` pelo SQL Editor depois das migrations.

Não aplique o seed em produção.

## 4. Bootstrap manual sem seed

### Salão

```sql
insert into public.salons (name, phone, city, plan)
values ('Salão Homologação', '(11) 99999-9999', 'São Paulo', 'trial')
returning id;
```

### Usuário Auth

Em **Authentication > Users**, crie o usuário com e-mail e senha. Copie o UUID.

### Vínculo interno

```sql
insert into public.users (id, salon_id, name, email, role)
values (
  '<AUTH_USER_UUID>',
  '<SALON_UUID>',
  'Administrador',
  'admin@homologacao.com.br',
  'admin'
);
```

Regras:

- use o mesmo e-mail do Auth;
- prefira o mesmo UUID em `public.users.id`;
- associe somente um salão;
- não duplique o e-mail;
- use `admin`, `gerente`, `atendimento` ou `leitura`.

## 5. Testar login e vínculo

1. Configure `.env.local`.
2. Execute `corepack.cmd pnpm dev`.
3. Entre em `/login`.
4. Confirme que o Dashboard carrega o salão correto.
5. Remova temporariamente o vínculo em homologação e confirme o aviso de usuário sem salão.

## 6. Validar RLS

Crie:

- Salão A e Salão B;
- Usuário Auth A vinculado ao Salão A;
- Usuário Auth B vinculado ao Salão B;
- pelo menos um cliente identificável em cada salão.

Teste com sessões reais:

- A lista do usuário A contém somente dados do Salão A.
- A lista do usuário B contém somente dados do Salão B.
- Um usuário sem linha em `public.users` não recebe dados.
- Um insert com `salon_id` de outro salão é recusado.

O SQL Editor usa privilégios administrativos e não comprova RLS. Para testar policies, use o app autenticado ou o Data API com o JWT de cada usuário.

## 7. Validar permissões

Crie um usuário de cada role e siga a seção correspondente em [QA_CHECKLIST.md](QA_CHECKLIST.md).

A RLS atual isola salões, enquanto a diferenciação de roles ocorre na aplicação.

## 8. Validar auditoria

Como administrador:

1. faça uma importação;
2. altere uma configuração do salão;
3. altere a função de um usuário;
4. crie e conclua um follow-up;
5. provoque uma tentativa negada com uma role sem permissão;
6. abra `/configuracoes` e confira “Últimas atividades”.

Valide no banco:

```sql
select
  created_at,
  user_email,
  action,
  entity_type,
  metadata
from public.audit_logs
where salon_id = '<SALON_UUID>'
order by created_at desc
limit 20;
```

Confirme que logs de outro salão não aparecem em uma sessão autenticada comum.

## 9. Cuidados operacionais

- Service role ignora RLS e deve permanecer server-side.
- Não use `SALON_ID` em produção.
- Não faça `db reset` em ambiente remoto com dados reais.
- Não use o SQL Editor como evidência de isolamento RLS.
- Não promova para produção sem concluir o checklist multi-tenant.
