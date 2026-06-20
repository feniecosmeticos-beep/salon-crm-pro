# Salon CRM Pro — Checklist de QA e homologação

> Última revisão: 19 de junho de 2026  
> Ambiente: ____________________  
> Versão/commit: ____________________  
> Responsável: ____________________  
> Data: ____________________

Registre evidência, usuário utilizado e resultado de cada falha. Não use dados pessoais reais antes de validar isolamento e segurança.

## Execução da Fase 10B — 19 de junho de 2026

Status: **bloqueada antes da homologação real**.

- [x] Node.js compatível.
- [x] Dependências e lockfile presentes.
- [x] Supabase CLI disponível.
- [x] `supabase/config.toml` inicializado sem sobrescrever migrations.
- [x] Lint aprovado.
- [x] TypeScript aprovado.
- [x] Build aprovado.
- [ ] `.env.local` presente.
- [ ] Variáveis obrigatórias configuradas.
- [ ] Projeto Supabase remoto vinculado.
- [ ] Migrations remotas verificadas ou aplicadas.
- [ ] Cenários reais de Auth, RLS, AVEC, permissões e auditoria executados.

Evidências e instruções para retomada: [QA_RESULTS.md](QA_RESULTS.md).

## 1. Ambiente

- [ ] Node.js `>= 20.9.0`.
- [ ] Dependências instaladas com lockfile.
- [ ] Variáveis do ambiente conferidas.
- [ ] `SALON_ID` ausente em homologação/produção.
- [x] `corepack.cmd pnpm lint` aprovado.
- [x] `corepack.cmd pnpm tsc --noEmit` aprovado.
- [x] `corepack.cmd pnpm build` aprovado.
- [ ] Build de produção inicia com `corepack.cmd pnpm start`.
- [ ] `/login` carrega.
- [ ] Login válido funciona.
- [ ] Login inválido mostra erro controlado.
- [ ] Logout encerra a sessão.
- [ ] Sessão permanece após recarregar.
- [ ] Usuário sem sessão é redirecionado para `/login`.
- [ ] Usuário autenticado não permanece na tela de login.
- [ ] Rotas privadas estão protegidas.

## 2. Multi-tenant e RLS

Preparar dois salões e dois usuários independentes.

- [ ] Usuário A visualiza somente dados do Salão A.
- [ ] Usuário B visualiza somente dados do Salão B.
- [ ] Cliente do Salão B não abre pelo ID na sessão do Usuário A.
- [ ] Usuário sem vínculo em `public.users` não acessa dados.
- [ ] Usuário com e-mail duplicado falha de forma segura.
- [ ] Insert com `salon_id` de outro salão é bloqueado.
- [ ] Update com `salon_id` de outro salão é bloqueado.
- [ ] Logs de auditoria permanecem isolados por salão.
- [ ] O navegador não envia nem escolhe o tenant da importação.

Não use o SQL Editor como prova de RLS.

## 3. Importação AVEC

Use arquivos de homologação sem dados pessoais reais.

### Clientes

- [ ] Importar relatório “Clientes”.
- [ ] Validar criação e atualização.
- [ ] Confirmar preservação de campos quando células vêm vazias.

### Clientes atendidos

- [ ] Importar “Clientes atendidos”.
- [ ] Confirmar última visita, total de visitas e gastos agregados.

### Serviços realizados

- [ ] Importar “Serviços realizados”.
- [ ] Confirmar cliente, profissional, serviço e atendimento.
- [ ] Reimportar o mesmo arquivo e verificar deduplicação esperada.

### Tabela de serviços/preços

- [ ] Importar “Tabela de serviços” como tabela de preços.
- [ ] Confirmar nome, categoria e preço padrão.

### Produtos vendidos

- [ ] Importar “Produtos vendidos”.
- [ ] Confirmar quantidade, valor e vínculo com o cliente.
- [ ] Reimportar e verificar deduplicação esperada.

### Resultado

- [ ] Linhas inválidas são destacadas antes da persistência.
- [ ] Uma falha de linha não interrompe as demais.
- [ ] `public.imports` contém o resumo correto.
- [ ] Auditoria contém `import_avec_completed`.
- [ ] Métricas dos clientes foram recalculadas.
- [ ] Dashboard reflete os novos dados.

## 4. CRM

### Dashboard

- [ ] Cards e totais carregam.
- [ ] Gráficos carregam sem erro.
- [ ] Central de Oportunidades exibe prioridades.

### Clientes

- [ ] Lista carrega.
- [ ] Busca funciona.
- [ ] Filtros de status, nível e produtos funcionam.
- [ ] Visualização mobile não gera rolagem horizontal indevida.

### Perfil

- [ ] Cabeçalho, métricas e históricos carregam.
- [ ] Produtos e follow-ups correspondem ao cliente.
- [ ] Copiar telefone e mensagem funciona.
- [ ] WhatsApp abre somente quando há celular.

### Campanhas

- [ ] Segmentos carregam.
- [ ] Lista e mensagem mudam com o segmento.
- [ ] Copiar mensagem e WhatsApp permanecem manuais.

### Oportunidades

- [ ] Cards e lista carregam no Dashboard.
- [ ] Ações respeitam permissões.

### Follow-ups

- [ ] Criar follow-up.
- [ ] Marcar como concluído.
- [ ] Reabrir.
- [ ] Atrasados, hoje e futuros aparecem na ordem esperada.

### Relatórios

- [ ] Resumo de produtividade carrega.
- [ ] Tarefas de hoje, atrasadas e concluídas recentemente conferem.
- [ ] Distribuição por tipo confere.

### Configurações

- [ ] Dados do salão carregam.
- [ ] Nome, telefone e cidade podem ser salvos por admin.
- [ ] Usuários internos carregam.
- [ ] Alteração de role funciona para admin.
- [ ] Últimas atividades mostram até dez registros.

## 5. Permissões

### Admin

- [ ] Vê todos os links.
- [ ] Importa AVEC.
- [ ] Usa Campanhas e Follow-ups.
- [ ] Vê Relatórios.
- [ ] Edita salão e usuários.
- [ ] Vê auditoria.

### Gerente

- [ ] Vê Dashboard, Clientes, Importação, Campanhas, Follow-ups e Relatórios.
- [ ] Não vê Configurações.
- [ ] Acesso direto a Configurações mostra “Acesso restrito”.
- [ ] Server Action de configuração recusa a mutação.

### Atendimento

- [ ] Vê Dashboard, Clientes, Campanhas e Follow-ups.
- [ ] Não vê Importação, Relatórios ou Configurações.
- [ ] Acessos diretos são bloqueados.
- [ ] Endpoint AVEC retorna `403`.

### Leitura

- [ ] Vê somente Dashboard e Clientes/Perfil.
- [ ] Não vê Importação, Campanhas, Follow-ups, Relatórios ou Configurações.
- [ ] Botões de criação de follow-up não aparecem.
- [ ] Mutações diretas são recusadas.

## 6. Auditoria

- [ ] Importação gera `import_avec_completed`.
- [ ] Alteração do salão gera `salon_settings_updated`.
- [ ] Mudança de role gera `team_user_role_updated`.
- [ ] Criação gera `followup_created`.
- [ ] Conclusão gera `followup_completed`.
- [ ] Reabertura gera `followup_reopened`.
- [ ] Ação bloqueada gera `permission_denied`.
- [ ] `user_id` e `user_email` correspondem ao usuário.
- [ ] `salon_id` corresponde ao salão da sessão.
- [ ] Metadados não contêm segredos.
- [ ] Falha de auditoria não desfaz a ação principal.
- [ ] Não-admin não visualiza o bloco de atividades.

## 7. Responsividade e navegadores

- [ ] Desktop.
- [ ] Notebook.
- [ ] Tablet.
- [ ] Mobile.
- [ ] Chrome/Chromium.
- [ ] Edge.
- [ ] Navegação por teclado nos fluxos principais.
- [ ] Console sem erros inesperados.

## 8. Aprovação

- [ ] Nenhum bloqueador aberto.
- [ ] Falhas conhecidas documentadas.
- [ ] Evidências anexadas.
- [ ] Backup/rollback definido.
- [ ] Ambiente aprovado para o próximo estágio.

Observações:

```text

```
