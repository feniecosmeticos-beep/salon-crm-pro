# Salon CRM Pro — Guia de deploy

> Última revisão: 19 de junho de 2026  
> Este guia prepara homologação e produção. Ele não substitui o [checklist de QA](QA_CHECKLIST.md).

## 1. Pré-requisitos

- Node.js `>= 20.9.0`
- pnpm `11.7.0`
- projeto Supabase criado
- Supabase CLI instalada, ou acesso ao SQL Editor
- plataforma compatível com Next.js App Router, SSR, Route Handlers e runtime Node.js
- domínio HTTPS para produção

O projeto não é uma aplicação de exportação estática.

## 2. Preparar o Supabase

Configure o projeto conforme [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

As migrations devem ser aplicadas na ordem:

1. `001_initial_schema.sql`
2. `002_rls_multi_tenant.sql`
3. `003_audit_logs.sql`

Com CLI:

```powershell
supabase.cmd init
supabase.cmd login
supabase.cmd link --project-ref <PROJECT_REF>
supabase.cmd db push --dry-run
supabase.cmd db push
supabase.cmd migration list
```

O repositório atualmente não possui `supabase/config.toml`. O `init` cria essa configuração; revise o arquivo gerado antes de versioná-lo.

## 3. Seed opcional

`supabase/seed.sql` é destinado a desenvolvimento ou homologação descartável.

- local: `supabase.cmd db reset`;
- remoto de homologação: executar pelo SQL Editor depois das migrations.

Não aplique o seed em produção.

## 4. Criar o primeiro salão

Execute no SQL Editor:

```sql
insert into public.salons (name, phone, city, plan)
values ('Meu Salão', '(11) 99999-9999', 'São Paulo', 'trial')
returning id;
```

Guarde o UUID retornado.

## 5. Criar o primeiro usuário

1. Abra **Authentication > Users**.
2. Crie o usuário administrador com e-mail e senha.
3. Copie o UUID do usuário Auth.
4. Insira a linha interna:

```sql
insert into public.users (id, salon_id, name, email, role)
values (
  '<AUTH_USER_UUID>',
  '<SALON_UUID>',
  'Administrador',
  'admin@meusalao.com.br',
  'admin'
);
```

O e-mail deve ser idêntico nos dois cadastros. Não crie registros duplicados para o mesmo e-mail.

## 6. Configurar variáveis

Configure:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`NEXT_PUBLIC_SUPABASE_ANON_KEY` permanece apenas como alternativa legada. Não configure `SALON_ID` fora do desenvolvimento sem Supabase.

Detalhes de segurança: [ENVIRONMENT.md](ENVIRONMENT.md).

## 7. Validar antes do deploy

```powershell
corepack.cmd pnpm install --frozen-lockfile
corepack.cmd pnpm lint
corepack.cmd pnpm tsc --noEmit
corepack.cmd pnpm build
```

## 8. Configurar a plataforma

Configuração genérica:

| Item | Valor |
| --- | --- |
| Install | `corepack pnpm install --frozen-lockfile` |
| Build | `corepack pnpm build` |
| Start | `corepack pnpm start` |
| Runtime | Node.js `>= 20.9.0` |

Em Windows, use `corepack.cmd`. Em ambientes Linux de CI/deploy, use `corepack`.

Cadastre as variáveis como segredos da plataforma. Não grave a service role em arquivos de build.

## 9. Configurar autenticação

No Supabase Auth:

- configure a URL oficial da aplicação;
- adicione URLs permitidas de homologação quando necessárias;
- exija HTTPS em produção;
- valide cookies e redirecionamentos de login/logout no domínio final.

O fluxo atual usa e-mail e senha e não possui cadastro público, convite ou recuperação de senha.

## 10. Validações pós-deploy

- [ ] `/login` carrega sem erro.
- [ ] Usuário válido entra e é redirecionado ao Dashboard.
- [ ] Logout encerra a sessão.
- [ ] Usuário sem sessão volta para `/login`.
- [ ] Usuário sem vínculo recebe o estado controlado.
- [ ] Dashboard, Clientes e Perfil carregam dados do salão correto.
- [ ] Permissões das quatro roles correspondem à matriz.
- [ ] Importação AVEC funciona para `admin` e `gerente`.
- [ ] Follow-ups podem ser alterados apenas pelas roles permitidas.
- [ ] Configurações e usuários internos são exclusivos de `admin`.
- [ ] Auditoria registra as ações esperadas.
- [ ] Usuários de salões diferentes não compartilham dados.

Registre evidências no [QA_CHECKLIST.md](QA_CHECKLIST.md) antes de promover o ambiente.

## Rollback

- Não edite migrations já aplicadas.
- Em caso de falha, interrompa a promoção e preserve banco e logs.
- Reverta a versão da aplicação pela plataforma.
- Para mudanças de banco futuras, crie migrations corretivas; não use reset em banco remoto com dados reais.
