# Salon CRM Pro — Checklist de autenticação e isolamento

> Última revisão: 19 de junho de 2026 — Fase 9B  
> Autenticação, vínculo, RLS, autorização por papel e auditoria básica estão versionados. A homologação no Supabase remoto e a autorização por papel no banco permanecem pendentes.

## Fase 7A concluída

- [x] Confirmar Supabase Auth como provedor.
- [x] Implementar login por e-mail e senha.
- [x] Implementar logout da sessão atual.
- [x] Persistir e renovar sessão com cookies usando `@supabase/ssr`.
- [x] Criar helpers para usuário autenticado, sessão atual e exigência de autenticação.
- [x] Proteger páginas privadas com `src/proxy.ts`.
- [x] Redirecionar usuário sem sessão para `/login`.
- [x] Redirecionar usuário autenticado de `/login` para `/`.
- [x] Manter modo local controlado quando o Supabase não estiver configurado.
- [x] Manter `SALON_ID` e `getCurrentSalonId()` temporariamente.
- [x] Não alterar schema nem policies RLS nesta fase.

## Fase 7B concluída

- [x] Resolver `salon_id` no servidor a partir do usuário autenticado.
- [x] Consultar `public.users` por `auth.users.id` quando houver correspondência.
- [x] Usar igualdade de e-mail entre Supabase Auth e `public.users` como vínculo atual.
- [x] Recusar acesso a dados quando não existir um único usuário interno com `salon_id`.
- [x] Exibir estado controlado para usuário sem salão vinculado.
- [x] Proteger `POST /api/imports/avec` dentro do Route Handler.
- [x] Derivar o tenant da importação exclusivamente no servidor.
- [x] Manter `SALON_ID` apenas como fallback local sem Supabase configurado.
- [x] Não alterar schema nem policies RLS nesta fase.

## Fase 7C concluída no repositório

- [x] Criar `supabase/migrations/002_rls_multi_tenant.sql`.
- [x] Criar `public.current_user_salon_id()`.
- [x] Preferir vínculo por `auth.uid()` e usar e-mail do JWT como fallback único.
- [x] Restringir a execução do helper ao papel `authenticated`.
- [x] Remover as policies permissivas versionadas na migration inicial.
- [x] Aplicar `USING` e `WITH CHECK` por `salon_id` nas dez tabelas de domínio.
- [x] Limitar `salons` a `SELECT` e `UPDATE` do próprio salão.
- [x] Preservar o bypass da service role para a importação server-side já protegida pela Fase 7B.
- [x] Não criar cadastro, convites, gestão de usuários ou multi-salão.

## Fases 8A e 8B concluídas no repositório

- [x] Criar configurações editáveis para o salão atual.
- [x] Listar usuários internos exclusivamente do salão autenticado.
- [x] Identificar o usuário interno atual por ID Auth ou e-mail.
- [x] Suportar as funções `admin`, `gerente`, `atendimento` e `leitura`.
- [x] Permitir edição de função somente para administradores na aplicação.
- [x] Revalidar o papel de administrador dentro do service antes do update.
- [x] Limitar o update por `userId` e `salon_id`.
- [x] Manter usuários não administradores em modo somente leitura.
- [x] Não criar usuários Auth, convites, cadastro público ou reset de senha.
- [x] Não alterar schema ou policies RLS.

## Fase 9A concluída no repositório

- [x] Centralizar a matriz em `permissions.service.ts`.
- [x] Resolver o papel atual exclusivamente por `public.users`.
- [x] Filtrar a navegação desktop e mobile conforme o papel.
- [x] Proteger Dashboard, Clientes, Perfil, Importação, Campanhas, Follow-ups, Relatórios e Configurações.
- [x] Exibir estado controlado de acesso restrito.
- [x] Limitar importação AVEC a `admin` e `gerente`.
- [x] Limitar mutações de follow-ups a `admin`, `gerente` e `atendimento`.
- [x] Limitar configurações e usuários internos a `admin`.
- [x] Preservar o modo local sem Supabase com fallback administrativo.
- [x] Não alterar schema, RLS ou policies.

### Matriz aplicada

| Permissão | admin | gerente | atendimento | leitura |
| --- | --- | --- | --- | --- |
| Dashboard, Clientes e Perfil | Sim | Sim | Sim | Sim |
| Importação AVEC | Sim | Sim | Não | Não |
| Campanhas | Sim | Sim | Sim | Não |
| Follow-ups | Sim | Sim | Sim | Não |
| Relatórios | Sim | Sim | Não | Não |
| Configurações e usuários | Sim | Não | Não | Não |

## Fase 9B concluída no repositório

- [x] Criar `supabase/migrations/003_audit_logs.sql`.
- [x] Criar `audit_logs` com vínculo obrigatório ao salão.
- [x] Ativar RLS na nova tabela.
- [x] Permitir `SELECT` e `INSERT` somente para o salão autenticado.
- [x] Manter compatibilidade com service role nos registros server-side.
- [x] Resolver usuário e tenant no servidor antes de cada insert.
- [x] Registrar importação AVEC concluída.
- [x] Registrar alterações do salão e funções internas.
- [x] Registrar criação, conclusão e reabertura de follow-ups.
- [x] Registrar recusas prioritárias por permissão.
- [x] Exibir as dez atividades mais recentes somente para `admin`.
- [x] Garantir que falhas de auditoria não interrompam a ação principal.

## Preparação já concluída

- [x] Centralizar a resolução temporária do salão em código `server-only`.
- [x] Manter `SALON_ID` como fallback exclusivamente server-side para desenvolvimento local.
- [x] Impedir que o browser escolha ou envie o `salon_id` da importação.
- [x] Aplicar `salon_id` em todas as consultas de dashboard, clientes, perfil e logs.
- [x] Aplicar `salon_id` em buscas, updates, deduplicação e métricas da importação.
- [x] Mover a leitura de logs de importação para o cliente Supabase de servidor.
- [x] Revalidar tipo e linhas da importação no Route Handler.
- [x] Manter a service role fora do bundle do browser.

## Decisões antes da implementação

- [x] Confirmar Supabase Auth como provedor.
- [x] Definir e-mail e senha como método inicial de login.
- [ ] Definir política de convite e criação do primeiro administrador.
- [x] Definir os papéis iniciais `admin`, `gerente`, `atendimento` e `leitura`.
- [ ] Definir se um usuário pode pertencer a mais de um salão.
- [ ] Definir política de sessão, expiração e recuperação de acesso.

## Modelo de dados

- [ ] Vincular o usuário da aplicação a `auth.users.id`.
- [ ] Decidir entre adaptar `users` ou criar uma tabela de memberships.
- [ ] Tornar `salon_id` obrigatório nas tabelas de domínio após limpar dados nulos.
- [ ] Criar unicidade adequada para e-mail/membership.
- [ ] Impedir referências cruzadas entre entidades de salões diferentes.
- [ ] Criar migration nova; não editar migrations já aplicadas em produção.

## Contexto de sessão

- [x] Substituir a resolução operacional de `getCurrentSalonId()` por contexto baseado na sessão autenticada.
- [ ] Remover o fallback de desenvolvimento e a variável temporária `SALON_ID`.
- [x] Retornar contexto sem tenant quando não houver sessão.
- [x] Validar que o usuário está vinculado a um salão.
- [ ] Validar que o usuário está ativo quando o modelo de dados tiver esse atributo.
- [x] Disponibilizar o papel atual sem aceitar autorização declarada pelo browser.

## Proteção de rotas

- [x] Proteger páginas privadas no servidor.
- [x] Autorizar páginas privadas conforme o papel do usuário interno.
- [x] Ocultar links não permitidos na sidebar e no menu mobile.
- [x] Retornar estado “Acesso restrito” em acesso direto sem permissão.
- [x] Proteger `POST /api/imports/avec` no próprio handler.
- [x] Garantir que o Route Handler de importação derive o tenant no servidor.
- [x] Retornar `401` sem sessão e `403` sem vínculo na importação.
- [x] Impedir acesso direto a IDs de clientes de outro salão por filtros server-side.

## RLS

- [x] Substituir policies `USING (true)` e `WITH CHECK (true)`.
- [x] Criar função para descobrir o salão permitido ao usuário autenticado.
- [x] Aplicar policies de `SELECT`, `INSERT`, `UPDATE` e `DELETE` por tenant.
- [x] Testar localmente tentativas de leitura e escrita entre dois salões com JWT simulado.
- [x] Impedir por policy que inserts usem `salon_id` diferente do tenant autenticado.
- [x] Revisar acesso às tabelas `users`, `salons`, `imports`, `campaigns` e `follow_ups`.
- [x] Criar policies isoladas para `audit_logs` sem alterar as policies existentes.

## Service role

- [ ] Inventariar cada uso da service role.
- [ ] Preferir cliente autenticado/RLS nas operações comuns.
- [ ] Manter service role apenas em operações administrativas justificadas.
- [ ] Para cada uso restante, validar sessão, papel e tenant antes da consulta.
- [x] Validar sessão, usuário e tenant no service de auditoria antes de gravar com service role.
- [x] Nunca retornar a chave ou criar cliente service role em módulos client-side.

## Testes obrigatórios

- [ ] Usuário sem sessão não acessa páginas privadas.
- [ ] Usuário do salão A não lê cliente do salão B.
- [ ] Usuário do salão A não altera cliente do salão B.
- [x] Importação não aceita `salon_id` enviado pelo browser.
- [ ] IDs válidos de outro tenant retornam não encontrado ou proibido.
- [x] Não-admins são recusados pelo service ao tentar editar funções internas.
- [ ] Homologar navegação, rotas e ações com `admin`, `gerente`, `atendimento` e `leitura`.
- [ ] Homologar criação e isolamento de logs entre dois salões.
- [ ] Confirmar que somente `admin` visualiza “Últimas atividades”.
- [ ] Policies RLS bloqueiam acesso mesmo fora da interface.

## Configuração e operação

- [ ] Separar URLs e chaves Supabase por ambiente.
- [ ] Configurar URLs de callback autorizadas.
- [ ] Revisar cookies, HTTPS e domínios.
- [ ] Definir rotação e armazenamento de segredos.
- [ ] Criar procedimento de revogação de acesso.
- [ ] Documentar bootstrap do primeiro salão e usuário.

## Critério de conclusão da Fase 8

A autenticação só estará concluída quando identidade, sessão, autorização de rota e isolamento RLS estiverem funcionando juntos. Uma tela de login isolada não é suficiente.

## Vínculo manual atual

1. Crie o usuário em **Supabase > Authentication > Users**.
2. Use exatamente o mesmo e-mail em uma linha de `public.users`.
3. Preencha `public.users.salon_id` com o salão permitido.
4. Mantenha uma única linha por e-mail. Ausência, duplicidade ou `salon_id` nulo resultam em bloqueio controlado.

O `supabase/seed.sql` fornece exemplos de registros internos, mas não cria contas em `auth.users`.

## Como aplicar a migration

Com o projeto Supabase já vinculado pela CLI:

```powershell
supabase.cmd db push --dry-run
supabase.cmd db push
supabase.cmd migration list
```

Em ambiente local com a stack Supabase iniciada, `supabase.cmd db reset` reaplica todas as migrations e depois executa o seed. Não execute reset contra um banco remoto com dados reais.

## Homologação de isolamento

1. Crie o Salão A e o Salão B com acesso administrativo ou service role.
2. Crie o Usuário Auth A e o Usuário Auth B.
3. Vincule A ao Salão A e B ao Salão B em `public.users`.
4. Crie pelo menos um cliente em cada salão.
5. Faça uma requisição ao Data API com o token do Usuário A e confirme que somente linhas do Salão A são retornadas.
6. Repita com o token do Usuário B e confirme que somente linhas do Salão B são retornadas.
7. Com o token do Usuário A, tente inserir ou atualizar uma linha usando o `salon_id` do Salão B; a operação deve ser recusada pela RLS.
8. Autentique um usuário sem linha em `public.users`; selects devem retornar vazio e escritas devem ser recusadas.

O teste direto no Data API é necessário para exercitar a RLS. As consultas server-side atuais usam service role e continuam protegidas separadamente pelo contexto de salão e filtros explícitos.

A migration foi validada em PostgreSQL 17 descartável: cada usuário enxergou somente uma linha do próprio salão, o fallback único por e-mail funcionou, usuário sem vínculo recebeu zero linhas e o insert cruzado foi bloqueado. Essa validação não substitui a homologação no projeto Supabase remoto.

## Trabalho posterior à Fase 7C

- tornar explícito e obrigatório o vínculo com `auth.users.id`;
- tornar `salon_id` obrigatório após sanear dados nulos;
- impedir referências cruzadas por constraints compostas;
- reduzir ou remover service role das operações comuns;
- automatizar testes de leitura e escrita entre pelo menos dois salões;
- revisar papéis, expiração, revogação, HTTPS, callbacks e operação dos ambientes.
- levar autorização por papel para o banco ou para políticas equivalentes antes de expor mutações diretas ao Data API.

## Limitações da gestão de usuários internos

- a tela apenas gerencia registros já existentes em `public.users`;
- criar conta no Supabase Auth e vincular o e-mail continua sendo um processo manual;
- não há convite, cadastro público, reset de senha ou desativação de acesso;
- as funções protegem rotas e mutações na aplicação, mas não alteram as policies RLS;
- o service da aplicação exige `admin` para atualizar funções, mas as policies RLS atuais isolam por salão e não diferenciam papéis dentro do mesmo salão;
- o valor legado `manager` é exibido como `gerente`, sem migração automática do dado.

## Limitações atuais

- o vínculo de produção ainda depende da correspondência manual de e-mail, salvo quando `public.users.id` já coincide com `auth.users.id`;
- `SALON_ID` continua disponível somente no modo local sem Supabase configurado;
- a migration de RLS precisa estar aplicada no ambiente remoto;
- os services server-side ainda usam service role depois de validar sessão e tenant;
- service role ignora RLS por definição;
- papéis controlam navegação, rotas e mutações sensíveis na aplicação;
- policies RLS ainda não diferenciam `admin`, `gerente`, `atendimento` e `leitura`;
- a auditoria é básica, sem filtros, exportação, alertas ou política de retenção;
- falhas de auditoria são intencionalmente não bloqueantes;
- não há criação de usuários, recuperação de senha, convites ou OAuth;
- sem configuração pública do Supabase, o modo local continua acessível para preservar os fallbacks de desenvolvimento.
