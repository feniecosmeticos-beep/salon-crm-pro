# Salon CRM Pro — Status do projeto

> Última revisão: 19 de junho de 2026 — Fase 10A, Preparação para produção e homologação  
> Escopo desta revisão: documentação operacional, configuração de ambiente, deploy, Supabase e checklist de QA. Funcionalidades, schema, RLS, autenticação, importação e interface não foram alterados.

## Visão geral

O Salon CRM Pro é um CRM comercial para salões de beleza. O sistema centraliza dados de clientes, histórico de atendimentos e compras de produtos, calcula métricas de relacionamento e transforma essas informações em prioridades comerciais.

O produto atual já funciona como um MVP técnico para:

- importar planilhas AVEC;
- persistir clientes, serviços, profissionais, atendimentos e vendas no Supabase;
- recalcular métricas de clientes;
- visualizar indicadores comerciais no dashboard;
- consultar e filtrar a carteira de clientes;
- abrir um perfil individual com histórico, métricas e sugestões de contato;
- consultar e editar os dados principais do salão vinculado;
- visualizar os usuários internos e, como administrador, editar suas funções;
- limitar áreas e ações conforme os papéis `admin`, `gerente`, `atendimento` e `leitura`;
- rastrear ações operacionais relevantes por usuário e salão;
- iniciar um contato manual pelo WhatsApp.

Login, logout, sessão por cookies e proteção básica das páginas principais usam Supabase Auth. O usuário autenticado determina o `salon_id` operacional por meio da tabela `users`, e a migration `002_rls_multi_tenant.sql` substitui as policies permissivas por isolamento real no banco para requisições autenticadas.

## Stack utilizada

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 16.2.9 com App Router |
| Interface | React 19.2.4 |
| Linguagem | TypeScript 5 em modo `strict` |
| Estilos | Tailwind CSS 4 |
| Componentes | Estrutura shadcn/ui sobre Radix UI |
| Ícones | Lucide React |
| Gráficos | Recharts |
| Banco, API e autenticação | Supabase/PostgreSQL com `@supabase/supabase-js` e `@supabase/ssr` |
| Planilhas | SheetJS/XLSX |
| Tabelas | TanStack Table instalado, mas a carteira atual usa tabela própria |
| Formulários e validação | React Hook Form e Zod instalados, ainda sem uso relevante nos fluxos atuais |
| Gerenciador de pacotes | pnpm 11.7.0 |

## Arquitetura atual

### Organização

```text
src/
├─ app/                     # Rotas App Router e endpoint de importação
├─ components/
│  ├─ crm/                 # Badges e estados vazios do domínio
│  ├─ layout/              # AppShell, sidebar, topbar e PageShell
│  └─ ui/                  # Primitivos shadcn/ui
├─ features/
│  ├─ dashboard/
│  ├─ clients/
│  ├─ imports/
│  ├─ campaigns/
│  ├─ followups/
│  ├─ reports/
│  └─ settings/
├─ lib/
│  └─ supabase/            # Clientes Supabase de browser e servidor
├─ services/               # Consultas e agregações de dados
└─ types/                  # Tipos manuais do banco e navegação

supabase/
├─ migrations/             # Schema SQL versionado
└─ seed.sql                # Dados fictícios de desenvolvimento
```

### Fluxo de dados

1. As rotas em `src/app` montam páginas por feature.
2. Dashboard, carteira e perfil executam consultas em Server Components por meio de serviços `server-only`.
3. O salão atual é resolvido por `getCurrentSalonId()` em módulo `server-only`: o usuário autenticado é buscado na tabela `users` por `auth.users.id` quando houver correspondência e, como vínculo atual, pelo e-mail; o `salon_id` encontrado é usado em todas as consultas.
4. Todas as consultas atuais aplicam `salon_id` explicitamente, inclusive relações do perfil e logs.
5. O `proxy.ts` renova a sessão Supabase Auth e protege as páginas privadas quando as variáveis públicas do Supabase estão configuradas.
6. Requisições ao Data API com JWT de usuário passam pelas policies baseadas em `current_user_salon_id()`.
7. A importação é iniciada no browser, onde a planilha é lida, normalizada e validada.
8. Apenas as linhas válidas, sem `salon_id`, são enviadas em JSON para `POST /api/imports/avec`.
9. O endpoint valida novamente tipo, estrutura e campos obrigatórios, resolve o salão no servidor e usa a service role para persistir os dados, recalcular métricas e gravar o log.

### Decisões estruturais já presentes

- App Router e Server Components para leitura de dados.
- Componentes client-side apenas onde há interação, filtros, upload ou clipboard.
- Separação entre página, feature, serviço, tipos e acesso ao Supabase.
- Banco preparado conceitualmente para vários salões por meio de `salon_id`.
- Contexto de tenant centralizado no servidor e derivado da sessão autenticada.
- Regras de métricas centralizadas em módulo puro compartilhado.
- Dados de desenvolvimento isolados em `supabase/seed.sql`.
- Fallback visual quando as variáveis do Supabase não estão configuradas.
- Sessão Supabase Auth persistida em cookies com renovação no Proxy do Next.js.
- Modo local preservado: sem configuração pública do Supabase, as páginas continuam acessíveis com seus fallbacks anteriores.
- `SALON_ID` preservado somente como fallback local/de desenvolvimento quando o Supabase não está configurado.
- RLS multi-tenant versionada para todas as tabelas expostas do domínio.
- Service role preservada apenas nos fluxos server-side atuais; ela ignora RLS e continua dependendo da validação de sessão e tenant da aplicação.
- Configurações do salão carregadas e atualizadas somente após resolução server-side do tenant.
- Gestão de funções internas autorizada no servidor e limitada ao salão autenticado.

## Fases 7A, 7B e 7C — Autenticação e isolamento por salão

Status: concluída no repositório.

Implementado:

- rota pública `/login` com e-mail, senha, loading e erro controlado;
- login por `supabase.auth.signInWithPassword`;
- logout local por `supabase.auth.signOut({ scope: "local" })`;
- sessão SSR em cookies com `@supabase/ssr`;
- renovação e validação de claims no `src/proxy.ts`;
- redirecionamento de usuários sem sessão para `/login`;
- redirecionamento de usuários autenticados de `/login` para `/`;
- proteção de Dashboard, Clientes, Perfil do Cliente, Importação, Campanhas, Follow-ups, Relatórios e futura rota de Configurações;
- helpers server-side para obter usuário, obter sessão e exigir autenticação;
- suporte a `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e compatibilidade com a chave legada `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- estado controlado quando o Supabase não está configurado.
- resolução server-side do salão pela sessão autenticada;
- busca do vínculo interno primeiro por `users.id = auth.users.id` e depois pelo e-mail autenticado;
- bloqueio de consultas quando um usuário autenticado não possui um único `salon_id` válido;
- aviso global controlado: “Usuário sem salão vinculado. Verifique o cadastro interno.”;
- `POST /api/imports/avec` resolve o tenant no servidor e retorna `401` sem sessão ou `403` sem vínculo, sem aceitar `salon_id` do navegador;
- services de Dashboard, Clientes, Perfil, Campanhas, Follow-ups, Produtividade, Oportunidades e Importações continuam filtrando explicitamente pelo salão resolvido.
- função SQL `public.current_user_salon_id()` com preferência por `auth.uid()` e fallback por e-mail do JWT;
- fallback por e-mail aceito somente quando existe um único registro interno correspondente;
- policies permissivas removidas e substituídas por policies de tenant para `users`, `clients`, `professionals`, `services`, `appointments`, `product_sales`, `client_metrics`, `follow_ups`, `campaigns` e `imports`;
- leitura e atualização de `salons` limitadas ao salão vinculado;
- inserts protegidos por `WITH CHECK`, impedindo `salon_id` diferente do tenant autenticado;
- usuários sem vínculo recebem `NULL` do helper e não acessam linhas por RLS.

Limitações intencionais:

- o vínculo garantido nesta fase é de um usuário para um único salão;
- o vínculo pode usar o mesmo UUID de `auth.users.id`, mas o fluxo documentado atual usa a igualdade de e-mail com `public.users`;
- `SALON_ID` permanece somente no fallback de desenvolvimento sem Supabase configurado;
- a migration de RLS ainda precisa ser aplicada e homologada no projeto Supabase remoto;
- os serviços server-side continuam usando service role, que ignora RLS, além dos filtros explícitos e da validação de contexto;
- não há cadastro público, recuperação de senha, convites, OAuth ou gestão de usuários.

### Como vincular manualmente um usuário

1. Crie o usuário em **Supabase > Authentication > Users**.
2. Cadastre ou confirme uma linha em `public.users` com o mesmo e-mail do usuário Auth.
3. Preencha `public.users.salon_id` com o `id` do salão correspondente.
4. Garanta que exista apenas uma linha para esse e-mail. E-mails ausentes ou duplicados falham de forma segura, sem carregar dados de outro salão.

O `supabase/seed.sql` já contém exemplos de usuários internos. Ele não cria contas no Supabase Auth.

Próximas etapas:

- aplicar `002_rls_multi_tenant.sql` em staging e produção;
- homologar leitura e escrita com dois usuários de salões diferentes;
- reduzir o uso de service role nas operações comuns em uma fase posterior;
- criar vínculo estrutural direto com `auth.users.id` sem remover o fallback compatível por e-mail antes da migração dos dados.

## Fase 8A — Configurações do Salão

Status: concluída no repositório.

Implementado:

- rota protegida `/configuracoes`;
- service `settings.service.ts` para leitura e atualização do salão atual;
- consulta de `salons` sempre limitada ao `salon_id` resolvido por `salon-context.ts`;
- edição somente de `name`, `phone` e `city`;
- exibição somente leitura de `id`, `plan` e `created_at`;
- Server Action que não recebe `id` nem `salon_id` do navegador;
- estados de carregamento, sucesso, erro, Supabase não configurado e usuário sem salão;
- bloco informativo sobre vínculo e isolamento do acesso;
- item “Configurações” habilitado na navegação desktop e mobile;
- fallback local preservado sem Supabase configurado.

Na Fase 8A não foram incluídos gestão de usuários, alterações de schema, mudanças de RLS ou modificações nas demais áreas do produto.

## Fase 8B — Usuários internos

Status: concluída no repositório.

Implementado:

- seção “Usuários internos” dentro de `/configuracoes`;
- service `team-users.service.ts` com listagem, resumo, identificação do usuário atual e atualização de função;
- consultas de `public.users` sempre filtradas pelo `salon_id` resolvido no servidor;
- identificação de `getCurrentAppUser()` por `auth.users.id` ou e-mail autenticado;
- funções permitidas: `admin`, `gerente`, `atendimento` e `leitura`;
- compatibilidade de leitura do valor legado `manager` como `gerente`;
- cards com total, admins, gerentes, atendimentos e leitura;
- tabela desktop e cartões responsivos no mobile;
- edição com ações de editar, salvar e cancelar;
- modo somente leitura e aviso para usuários não administradores;
- validação server-side de que somente `admin` pode atualizar funções;
- update limitado simultaneamente por `userId` e `salon_id`;
- estados de loading, erro, Supabase não configurado, salão sem vínculo e lista vazia.

Limitações intencionais:

- a fase não cria registros em `public.users`;
- não cria usuários no Supabase Auth, convites, cadastro público ou reset de senha;
- não implementa múltiplos salões por usuário;
- na entrega original da Fase 8B, as funções ainda não controlavam as demais rotas; essa limitação foi tratada pela Fase 9A;
- como a RLS atual isola por salão, mas não por papel, a exigência de `admin` para editar funções é aplicada pelo service da aplicação; autorização por papel diretamente no banco fica para uma fase futura.

Próximas etapas:

- homologar os fluxos de administrador e não-administrador com Supabase Auth real;
- definir uma futura estratégia de criação/vínculo e convite de usuários;
- homologar a autorização por papel entregue na Fase 9A.

## Fase 9A — Permissões por função na aplicação

Status: concluída no repositório.

Implementado:

- service `permissions.service.ts` como fonte da matriz de permissões;
- resolução do papel atual pela linha correspondente em `public.users`;
- fallback local administrativo somente quando o Supabase não está configurado;
- sidebar desktop e menu mobile filtrados pelas permissões do usuário;
- proteção page-level de Dashboard, Clientes, Perfil, Importação, Campanhas, Follow-ups, Relatórios e Configurações;
- estado “Acesso restrito” para tentativas diretas sem permissão;
- Route Handler AVEC limitado a `admin` e `gerente`;
- criação e alteração de follow-ups limitadas a `admin`, `gerente` e `atendimento`;
- atualização das configurações e funções internas limitada a `admin`;
- atalhos de criação de follow-up ocultos para usuários sem `manage_followups`.

Matriz:

| Área | admin | gerente | atendimento | leitura |
| --- | --- | --- | --- | --- |
| Dashboard, Clientes e Perfil | Sim | Sim | Sim | Sim |
| Importação AVEC | Sim | Sim | Não | Não |
| Campanhas | Sim | Sim | Sim | Não |
| Criar e editar follow-ups | Sim | Sim | Sim | Não |
| Relatórios | Sim | Sim | Não | Não |
| Configurações e usuários internos | Sim | Não | Não | Não |

Limitações intencionais:

- autorização por papel permanece na aplicação e não foi adicionada às policies RLS;
- não há editor de permissões, papéis personalizados ou permissões por registro;
- o modo local sem Supabase usa permissões de `admin` para preservar os fluxos de desenvolvimento.

## Fase 9B — Auditoria básica

Status: concluída no repositório.

Implementado:

- migration `003_audit_logs.sql` com a tabela `audit_logs`;
- índices por salão, usuário, ação e data;
- RLS com leitura e inserção limitadas ao salão autenticado;
- service `audit.service.ts` com criação resiliente e leitura dos logs recentes;
- captura server-side de usuário, e-mail, IP e user agent quando disponíveis;
- auditoria de importação AVEC concluída;
- auditoria de alterações nas configurações do salão;
- auditoria de mudanças de função dos usuários internos;
- auditoria de criação, conclusão e reabertura de follow-ups;
- auditoria das recusas prioritárias por permissão nessas áreas;
- bloco “Últimas atividades” em `/configuracoes`, limitado aos dez registros mais recentes e visível apenas para `admin`.

Limitações intencionais:

- não há página dedicada, filtros avançados, exportação, alertas ou retenção automática;
- falhas ao gravar auditoria são silenciosas e nunca desfazem a ação principal;
- a migration precisa ser aplicada no projeto Supabase antes que os logs sejam persistidos;
- a visualização atual usa o snapshot de `user_email` e não exibe os metadados detalhados.

## Fase 10A — Preparação para produção e homologação

Status: concluída no repositório.

Implementado:

- README reescrito com visão do produto, stack, módulos, requisitos, instalação e comandos;
- documentação completa das variáveis de ambiente e segurança da service role;
- guia de deploy para ambiente compatível com Next.js SSR;
- guia de criação, migrations, seed, Auth, vínculo e testes do Supabase;
- checklist de QA para ambiente, multi-tenant, AVEC, CRM, permissões e auditoria;
- ordem das migrations e bootstrap do primeiro salão e administrador documentados;
- limitações conhecidas e próximos estágios de promoção explicitados.

Arquivos operacionais:

- `README.md`
- `docs/DEPLOYMENT.md`
- `docs/ENVIRONMENT.md`
- `docs/SUPABASE_SETUP.md`
- `docs/QA_CHECKLIST.md`

Limitações desta fase:

- nenhuma migration foi aplicada em ambiente remoto;
- nenhum usuário Auth ou salão real foi criado;
- nenhum deploy foi executado;
- nenhum arquivo AVEC real foi processado;
- o repositório ainda não possui `supabase/config.toml`; o guia documenta sua criação pela CLI.

## Fases concluídas

As fases abaixo são uma classificação inferida do código atual; não havia um roadmap versionado antes deste documento.

### Fase 1 — Fundação técnica e layout

Status: concluída.

- Next.js, TypeScript e Tailwind configurados.
- Shell responsivo com sidebar, topbar e menu móvel.
- Navegação principal e padrões visuais compartilhados.
- Componentes-base de UI e identidade inicial do CRM.

### Fase 2 — Banco Supabase inicial

Status: concluída no repositório.

- Migration inicial com 11 tabelas.
- Relacionamentos, índices, triggers de `updated_at` e RLS básica.
- Seed fictício para desenvolvimento.
- Tipos TypeScript manuais para as tabelas.

Observação: a aplicação da migration e do seed em um projeto Supabase remoto não foi verificada nesta revisão.

### Fase 3 — Importação AVEC

Status: concluída como MVP.

- Upload de `.xlsx`.
- Cinco tipos de arquivo AVEC.
- Prévia das primeiras 50 linhas.
- Mapeamento por aliases de colunas.
- Normalização de texto, telefone, e-mail, datas e números.
- Separação entre linhas válidas e inválidas.
- Persistência por tipo de arquivo.
- Deduplicação em nível de aplicação.
- Recalculo de métricas e log da importação.

### Fase 4A — Visão comercial e carteira

Status: concluída.

- Dashboard com indicadores, gráficos e prioridades comerciais.
- Lista responsiva de clientes.
- Busca por nome ou celular.
- Filtros por status, nível e compra de produtos.
- Perfil individual em modo de consulta.
- Histórico de serviços e produtos.
- Timeline comercial.
- Sugestão de próxima melhor ação.
- Cópia de telefone/mensagem e abertura manual do WhatsApp.

### Fase H — Hardening técnico pré-autenticação

Status: concluída.

- Consultas de dashboard, clientes, perfil e logs filtradas por `salon_id`.
- Buscas, updates e deduplicação AVEC reforçados com `salon_id`.
- `salon_id` removido do payload controlado pelo browser.
- Naquele hardening, o contexto temporário de salão foi centralizado no servidor por `SALON_ID`; a Fase 7B posteriormente o substituiu pela sessão autenticada.
- Tipo e linhas AVEC revalidados no Route Handler.
- Payloads de update ignoram valores vazios e preservam dados existentes.
- Totais históricos de visitas e serviços preservados em importações detalhadas parciais.
- Regras de status, nível e dias sem visita centralizadas.
- Classificações de métricas atualizadas em memória durante as leituras principais.
- Checklist de preparação para autenticação e RLS criado.

## Funcionalidades implementadas

### Dashboard

- Total de clientes.
- Clientes ativos, em risco, inativos e VIP.
- Faturamento total.
- Ticket médio.
- Quantidade de serviços e produtos.
- Potencial de recuperação.
- Distribuição por status e nível.
- Faturamento mensal.
- Ranking dos cinco serviços mais realizados.
- Prioridades comerciais: risco, inativos, sem compra de produto e VIP sem visita recente.

### Clientes

- Leitura de clientes e métricas.
- Busca e filtros executados no browser.
- Visualização desktop e mobile.
- Link para perfil individual.
- Link manual `wa.me` quando há celular.

### Perfil do cliente

- Identificação básica, status e nível.
- Total gasto, ticket médio, visitas, última visita, dias sem visita e compra de produtos.
- Histórico de atendimentos com serviço, categoria, profissional e valor.
- Histórico de produtos.
- Timeline unificada de atendimentos, produtos e follow-ups.
- Próxima melhor ação gerada por regras locais.
- Cópia da mensagem sugerida.

O perfil ainda é somente leitura e não exibe todos os campos cadastrais disponíveis no banco.

### Importação AVEC

- Tipos suportados:
  - clientes;
  - clientes atendidos;
  - serviços realizados;
  - tabela de serviços;
  - produtos vendidos.
- Processamento da primeira planilha do arquivo.
- Persistência parcial: falhas em uma linha não desfazem linhas anteriores.
- Criação ou atualização de cadastros relacionados.
- Recalculo de métricas após importações que afetam clientes.
- Registro em `imports`.

## Rotas existentes

| Método | Rota | Implementação |
| --- | --- | --- |
| GET | `/` | Dashboard funcional |
| GET | `/clientes` | Carteira funcional com busca e filtros |
| GET | `/clientes/[id]` | Perfil individual funcional em modo de consulta |
| GET | `/importacao` | Fluxo funcional de importação AVEC |
| GET | `/login` | Login público com Supabase Auth |
| GET | `/campanhas` | Campanhas inteligentes |
| GET | `/followups` | Central operacional de follow-ups |
| GET | `/follow-ups` | Redirecionamento compatível para `/followups` |
| GET | `/relatorios` | Produtividade comercial |
| GET | `/configuracoes` | Consulta e edição dos dados do salão atual |
| POST | `/api/imports/avec` | Persistência da importação AVEC |

## Serviços existentes

### `dashboard.service.ts`

- `getDashboardData`
- `getDashboardSummary`
- `getClientsByStatus`
- `getClientsByLevel`
- agregações de receita, carteira, serviços e prioridades comerciais.

### `clients.service.ts`

- `getClients`
- `getClientById`
- `getClientMetrics`
- `getClientsWithMetrics`

### `client-profile.service.ts`

- `getClientProfile`
- `getClientAppointments`
- `getClientProductSales`
- `getClientFollowUps`
- composição da timeline comercial.

### `imports.service.ts`

- `getImportLogs`

O serviço existe, mas os logs ainda não são exibidos na interface.

### `settings.service.ts`

- `getCurrentSalonSettings`
- `updateCurrentSalonSettings`
- validação server-side dos campos editáveis;
- resolução obrigatória do salão pelo contexto autenticado;
- retorno controlado sem Supabase ou sem vínculo de salão.

### `team-users.service.ts`

- `getTeamUsers`
- `getCurrentAppUser`
- `getTeamUsersSummary`
- `updateTeamUserRole`
- validação server-side da função `admin`;
- filtro obrigatório por `salon_id` em leituras e updates.

### `permissions.service.ts`

- `getCurrentUserRole`
- `getCurrentUserPermissions`
- `canAccessRoute`
- `requirePermission`
- matriz central de rotas e ações por papel.

### `audit.service.ts`

- `createAuditLog`
- `getAuditLogs`
- `getRecentAuditLogs`
- resolução server-side de salão e usuário;
- falha controlada sem Supabase ou sem a migration aplicada.

### Serviços de configuração e conexão

- `supabase-config.ts`: verifica disponibilidade das variáveis públicas e de servidor.
- `salon-context.ts`: resolve e valida o tenant autenticado no servidor, mantendo `SALON_ID` apenas como fallback local.
- `lib/supabase/client.ts`: singleton tipado para o browser.
- `lib/supabase/server.ts`: cliente servidor com service role.
- `lib/client-metrics.ts`: fonte executável das regras de status, nível e dias sem visita.
- `services/supabase.ts`: cliente público opcional legado, sem uso identificado no fluxo atual.

### Núcleo da importação

- leitor de Excel;
- mapeadores AVEC;
- normalizadores;
- validadores;
- cliente HTTP da persistência;
- persistência no servidor;
- recalculo de métricas.

## Status atual

Classificação: **MVP funcional em desenvolvimento, ainda não pronto para produção**.

Pontos fortes atuais:

- estrutura de código clara por domínio;
- fluxo de importação ponta a ponta;
- dashboard e carteira conectados ao banco;
- perfil comercial útil e responsivo;
- configurações operacionais do salão com edição segura;
- schema suficiente para a próxima etapa do produto;
- documentação operacional preparada para homologação.

Bloqueios para produção:

- migration de RLS ainda não confirmada no Supabase remoto;
- migration de auditoria ainda não confirmada no Supabase remoto;
- autorização por papel ainda não existe nas policies RLS;
- ausência de testes automatizados;
- schema TypeScript mantido manualmente;
- nenhuma confirmação do estado do banco remoto nesta revisão;
- QA das quatro roles e de dois salões ainda não executado;
- deploy e teste com dados AVEC reais ainda pendentes.

## Correções realizadas no hardening

### Escopo de salão

1. Todas as consultas atuais em `dashboard.service.ts`, `clients.service.ts`, `client-profile.service.ts` e `imports.service.ts` filtram por `salon_id`.
2. Consultas de serviços e profissionais relacionadas ao perfil também validam o mesmo salão.
3. Updates, buscas, deduplicação e upsert de métricas AVEC aplicam o tenant.
4. A leitura dos logs deixou de usar o cliente público e passou a ser `server-only`.
5. O browser não envia mais `salon_id`; o Route Handler resolve o tenant no servidor.
6. Com Supabase configurado, o tenant vem do usuário autenticado e de `public.users.salon_id`.
7. Sem vínculo, consultas retornam dados vazios controlados e a importação é recusada.

### Persistência AVEC

1. Tipo, nome do arquivo, quantidade, estrutura e campos obrigatórios são validados novamente no servidor.
2. Valores `null`, `undefined` e textos vazios são removidos dos updates.
3. E-mail, celular, categorias, preços e valores existentes não são apagados quando a planilha omite esses dados.
4. Dados agregados de clientes atendidos são mesclados com métricas existentes.
5. Totais históricos não são reduzidos quando somente parte dos atendimentos detalhados está disponível.
6. `client_metrics.updated_at` é atualizado explicitamente.

### Métricas

1. As regras foram centralizadas em `src/lib/client-metrics.ts`.
2. R$ 3.000,00 agora classifica corretamente como `Diamante`.
3. As faixas monetárias são avaliadas de forma descendente, sem lacunas.
4. Dashboard, carteira e perfil atualizam classificação e dias sem visita durante a leitura.
5. As regras oficiais estão em [client-metrics-rules.md](./client-metrics-rules.md).

## Riscos restantes

### Dependentes de autenticação e banco

1. A migration `002_rls_multi_tenant.sql` precisa ser aplicada no ambiente remoto para que o isolamento entre em vigor.
2. Os serviços server-side continuam usando service role e, portanto, ignoram RLS; a segurança desses fluxos também depende da resolução server-side do salão e dos filtros explícitos.
3. O vínculo por e-mail ainda não possui unicidade garantida pelo schema; duplicidade faz o helper retornar `NULL`.
4. `salon_id` continua opcional no schema versionado, mas linhas nulas não passam nas policies autenticadas.
5. Os tipos TypeScript continuam manuais.
6. Não há constraints de unicidade equivalentes à deduplicação da aplicação.

Esses itens permanecem fora da Fase 7C ou dependem de aplicação e homologação no ambiente remoto. O plano está em [authentication-readiness-checklist.md](./authentication-readiness-checklist.md).

### Limitações funcionais já conhecidas

1. A importação continua sem transação global.
2. Produtos ainda localizam clientes apenas pelo nome.
3. A coluna de profissionais em “Clientes atendidos” não é persistida.
4. Linhas inválidas da prévia não entram no log do servidor.
5. “Clientes para chamar hoje” ainda representa clientes em risco ou inativos, sem agenda diária.
6. Campanhas, follow-ups e relatórios continuam estruturais.
7. O WhatsApp continua sendo apenas um link manual.

## Verificação da Fase 7C

Executado em 18 de junho de 2026:

| Comando | Resultado |
| --- | --- |
| `corepack.cmd pnpm lint` | aprovado |
| `corepack.cmd pnpm tsc --noEmit` | aprovado |
| `corepack.cmd pnpm build` | aprovado |
| migrations `001` + `002` em PostgreSQL 17 descartável | aprovadas |
| contagem final de policies / policies permissivas | `42` / `0` |
| leitura isolada A/B, usuário sem vínculo e insert cruzado | aprovados |

O teste SQL usou funções `auth.uid()` e `auth.jwt()` simuladas para validar a migration sem acessar o Supabase remoto. A homologação com usuários Auth reais ainda é necessária.

O build de produção concluiu as rotas existentes sem alterar layout, UX/UI ou funcionalidades de produto.

## Verificação da Fase 8A

Executado em 18 de junho de 2026:

| Comando | Resultado |
| --- | --- |
| `corepack.cmd pnpm lint` | aprovado |
| `corepack.cmd pnpm tsc --noEmit` | aprovado |
| `corepack.cmd pnpm build` | aprovado |

A rota também preserva estado vazio controlado quando o Supabase não está configurado. Os cenários de leitura e edição reais dependem de um ambiente Supabase com usuário e salão vinculados.

## Verificação da Fase 8B

Executado em 18 de junho de 2026:

| Comando | Resultado |
| --- | --- |
| `corepack.cmd pnpm lint` | aprovado |
| `corepack.cmd pnpm tsc --noEmit` | aprovado |
| `corepack.cmd pnpm build` | aprovado |

O modo sem Supabase permanece controlado. A homologação de edição exige usuários Auth reais vinculados como administrador e não-administrador.

## Verificação da Fase 9A

Executado em 19 de junho de 2026:

| Comando | Resultado |
| --- | --- |
| `corepack.cmd pnpm lint` | aprovado |
| `corepack.cmd pnpm tsc --noEmit` | aprovado |
| `corepack.cmd pnpm build` | aprovado |

No modo local sem Supabase, Dashboard, Clientes, Importação, Campanhas, Follow-ups, Relatórios e Configurações responderam com HTTP 200. A sidebar desktop e o menu mobile exibiram todas as áreas pelo fallback administrativo. A homologação da filtragem real exige contas Supabase Auth vinculadas a registros `admin`, `gerente`, `atendimento` e `leitura`.

## Verificação da Fase 9B

Executado em 19 de junho de 2026:

| Comando | Resultado |
| --- | --- |
| `corepack.cmd pnpm lint` | aprovado |
| `corepack.cmd pnpm tsc --noEmit` | aprovado |
| `corepack.cmd pnpm build` | aprovado |

O modo sem Supabase permanece controlado e não tenta persistir logs. A persistência e a visualização com dados reais exigem a aplicação de `003_audit_logs.sql`.

## Verificação da Fase 10A

Executado em 19 de junho de 2026:

| Comando | Resultado |
| --- | --- |
| `corepack.cmd pnpm lint` | aprovado |
| `corepack.cmd pnpm tsc --noEmit` | aprovado |
| `corepack.cmd pnpm build` | aprovado |

Os links locais dos novos documentos também foram verificados. `package.json`, `.env.example`, código, migrations, RLS e interface permaneceram sem alterações nesta fase.

## Próximos passos

1. Fase 10B — aplicar as migrations e executar `docs/QA_CHECKLIST.md` com Supabase real.
2. Fase 10C — configurar e validar o deploy.
3. Fase 10D — homologar importações com dados AVEC reais e autorizados.
4. Fase 11A — evoluir convites e gestão de usuários.
5. Fase 12A — avaliar integração futura com WhatsApp/API.

O detalhamento e a ordem estão em [roadmap.md](./roadmap.md).

## Fontes de verdade no repositório

- Banco inicial: [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql)
- RLS multi-tenant: [`supabase/migrations/002_rls_multi_tenant.sql`](../supabase/migrations/002_rls_multi_tenant.sql)
- Auditoria: [`supabase/migrations/003_audit_logs.sql`](../supabase/migrations/003_audit_logs.sql)
- Dados de desenvolvimento: [`supabase/seed.sql`](../supabase/seed.sql)
- Tipos: [`src/types/database.ts`](../src/types/database.ts)
- Rotas: [`src/app`](../src/app)
- Serviços: [`src/services`](../src/services)
- Importação: [`src/features/imports`](../src/features/imports)
- Regras de métricas: [`src/lib/client-metrics.ts`](../src/lib/client-metrics.ts)
- Checklist de autenticação: [`docs/authentication-readiness-checklist.md`](./authentication-readiness-checklist.md)
- Deploy: [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md)
- Ambiente: [`docs/ENVIRONMENT.md`](./ENVIRONMENT.md)
- Supabase: [`docs/SUPABASE_SETUP.md`](./SUPABASE_SETUP.md)
- QA: [`docs/QA_CHECKLIST.md`](./QA_CHECKLIST.md)
