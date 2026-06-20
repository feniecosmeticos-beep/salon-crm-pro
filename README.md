# Salon CRM Pro

CRM comercial para salões de beleza, criado para transformar dados do AVEC em visão de carteira, oportunidades de faturamento e rotina operacional.

O sistema importa relatórios `.xlsx`, organiza clientes e históricos, calcula métricas comerciais, permite campanhas e follow-ups manuais, aplica permissões por função e registra auditoria básica por salão.

## Stack

- Next.js 16.2.9 com App Router
- React 19.2.4
- TypeScript 5 em modo `strict`
- Tailwind CSS 4 e componentes no padrão shadcn/ui
- Supabase PostgreSQL, Auth e RLS
- `@supabase/ssr` e `@supabase/supabase-js`
- SheetJS/XLSX
- Recharts
- pnpm 11.7.0

## Módulos principais

- Dashboard comercial e Central de Oportunidades
- Carteira e perfil 360 de clientes
- Importação de cinco relatórios AVEC
- Campanhas inteligentes com contato manual
- Follow-ups operacionais
- Relatórios de produtividade comercial
- Configurações do salão
- Usuários internos e permissões por função
- Auditoria básica de ações sensíveis

## Requisitos

- Node.js `>= 20.9.0`
- Corepack habilitado
- pnpm `11.7.0`, definido em `package.json`
- Projeto Supabase para autenticação e persistência real
- Supabase CLI opcional para aplicar migrations

## Instalação local

```powershell
cd "C:\Projetos\SaaS Salao\salon-crm-pro"
corepack.cmd enable
corepack.cmd pnpm install
Copy-Item .env.example .env.local
```

Preencha o `.env.local` conforme [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md).

Para iniciar:

```powershell
corepack.cmd pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000).

Sem Supabase configurado, o app preserva estados controlados para desenvolvimento. Esse modo não representa uma homologação de autenticação, RLS ou persistência.

## Variáveis de ambiente

| Variável | Produção | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Obrigatória | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Obrigatória | Chave pública preferencial |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Alternativa legada | Fallback para a chave pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Obrigatória | Operações server-side privilegiadas |
| `SALON_ID` | Não usar | Fallback local sem Supabase |

Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no navegador, em variáveis `NEXT_PUBLIC_*`, logs ou repositórios.

Detalhes: [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md).

## Scripts

Os scripts existentes em `package.json` são:

| Comando | Finalidade |
| --- | --- |
| `corepack.cmd pnpm dev` | Servidor local com recarga |
| `corepack.cmd pnpm build` | Build otimizado de produção |
| `corepack.cmd pnpm start` | Executa o build de produção |
| `corepack.cmd pnpm lint` | ESLint |
| `corepack.cmd pnpm tsc --noEmit` | Validação TypeScript, executada diretamente pelo binário instalado |

Validação obrigatória antes de publicar:

```powershell
corepack.cmd pnpm lint
corepack.cmd pnpm tsc --noEmit
corepack.cmd pnpm build
```

## Preparar o Supabase

As migrations devem ser aplicadas nesta ordem:

1. `001_initial_schema.sql`
2. `002_rls_multi_tenant.sql`
3. `003_audit_logs.sql`

Com a Supabase CLI instalada e o projeto vinculado:

```powershell
supabase.cmd init
supabase.cmd login
supabase.cmd link --project-ref <PROJECT_REF>
supabase.cmd db push --dry-run
supabase.cmd db push
supabase.cmd migration list
```

O `init` é necessário neste checkout porque `supabase/config.toml` ainda não existe. Revise o arquivo gerado antes de versioná-lo.

Também é possível executar os três arquivos, na ordem, pelo SQL Editor do Supabase. Não edite migrations já aplicadas.

Guia completo: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

## Seed de desenvolvimento

O arquivo `supabase/seed.sql` cria um salão fictício e dados demonstrativos. Ele não cria contas no Supabase Auth.

Use o seed apenas em ambiente local, descartável ou de homologação:

- stack local inicializada: `supabase.cmd db reset`;
- projeto remoto de homologação: execute `supabase/seed.sql` pelo SQL Editor após as migrations.

Não aplique o seed em produção com dados reais.

## Primeiro salão e primeiro administrador

Crie o salão pelo SQL Editor:

```sql
insert into public.salons (name, phone, city, plan)
values ('Meu Salão', '(11) 99999-9999', 'São Paulo', 'trial')
returning id;
```

Depois:

1. acesse **Authentication > Users** no Supabase;
2. crie o usuário com e-mail e senha;
3. copie o UUID do usuário Auth;
4. vincule-o ao salão:

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

O e-mail em `public.users` deve ser igual ao e-mail do Auth. Usar o mesmo UUID é o vínculo preferencial; o sistema mantém fallback por e-mail único.

Roles disponíveis:

- `admin`
- `gerente`
- `atendimento`
- `leitura`

## Importação AVEC

Entre com um usuário `admin` ou `gerente`, abra `/importacao` e selecione um dos tipos:

1. Clientes
2. Clientes atendidos
3. Serviços realizados
4. Tabela de serviços
5. Produtos vendidos

Somente arquivos `.xlsx` são aceitos e apenas a primeira planilha é processada. Confira a prévia, corrija linhas inválidas e confirme a persistência.

Após importar:

- confira o resultado exibido;
- valide o registro em `public.imports`;
- confira clientes e históricos;
- verifique métricas recalculadas;
- como administrador, confira “Últimas atividades” em `/configuracoes`.

Mapeamento detalhado: [docs/avec-import.md](docs/avec-import.md).

## Deploy e QA

- Deploy: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Configuração do ambiente: [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)
- Preparação do Supabase: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)
- Checklist de homologação: [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md)
- Estado atual: [docs/project-status.md](docs/project-status.md)
- Roadmap: [docs/roadmap.md](docs/roadmap.md)

## Limitações conhecidas

- O projeto ainda precisa de QA com um Supabase real e dois salões independentes.
- A aplicação usa service role em serviços server-side; esses fluxos dependem da validação de sessão, permissão e `salon_id` feita pela aplicação.
- A RLS isola por salão, mas não diferencia funções internas.
- Não há convite, cadastro público, recuperação de senha ou desativação de usuário.
- Um usuário pertence a apenas um salão.
- A importação não possui transação global e pode concluir parcialmente.
- A deduplicação AVEC ocorre na aplicação, sem todas as constraints equivalentes no banco.
- A auditoria não possui filtros, exportação, alertas ou política de retenção.
- WhatsApp permanece manual, sem integração com API.
