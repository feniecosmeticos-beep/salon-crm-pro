# Salon CRM Pro — Roadmap

> Última revisão: 19 de junho de 2026  
> As fases foram organizadas a partir do código atual. “Concluída” significa presente no repositório; não significa homologada para produção.

## Resumo

| Fase | Tema | Status |
| --- | --- | --- |
| 1 | Fundação técnica e layout | Concluída |
| 2 | Banco Supabase inicial | Concluída no repositório |
| 3 | Importação AVEC | Concluída como MVP |
| 4A | Dashboard e carteira comercial | Concluída |
| H | Hardening técnico pré-autenticação | Concluída |
| 4B | Perfil completo do cliente | Concluída |
| 5 | Campanhas e Central de Oportunidades | Concluída |
| 6 | Follow-ups e produtividade comercial | Concluída |
| 7A–7C | Autenticação, vínculo e RLS | Concluída no repositório |
| 8A | Configurações do Salão | Concluída |
| 8B | Usuários internos | Concluída |
| 9A | Permissões por função na aplicação | Concluída |
| 9B | Auditoria básica | Concluída |
| 10A | Preparação para produção e homologação | Concluída |
| 10B | QA com Supabase real | Próxima |
| 10C | Deploy | Planejada |
| 10D | Teste com dados reais AVEC | Planejada |
| 11A | Convites e gestão de usuários | Backlog |
| 12A | WhatsApp/API futura | Backlog |

## Fases concluídas

### Fase 1 — Fundação técnica e layout

- Next.js 16, React 19 e TypeScript.
- Tailwind CSS 4 e componentes shadcn/ui.
- Shell responsivo com navegação desktop e mobile.
- Organização por `app`, `features`, `services`, `lib`, `components` e `types`.

### Fase 2 — Banco Supabase inicial

- Schema SQL com 11 tabelas.
- Relacionamentos, índices e triggers.
- RLS inicial.
- Seed fictício.
- Tipos TypeScript manuais.

Pendência de encerramento técnico:

- confirmar que migration e seed aplicados no ambiente remoto correspondem aos arquivos do repositório.

### Fase 3 — Importação AVEC

- Upload e leitura de `.xlsx`.
- Cinco tipos de arquivo.
- Mapeamento flexível de cabeçalhos.
- Normalização e validação.
- Prévia de dados.
- Persistência e deduplicação em aplicação.
- Recalculo de métricas.
- Log da importação.

Pendências de hardening:

- validação também no servidor;
- autenticação e autorização do endpoint;
- transação ou estratégia explícita de idempotência;
- proteção contra perda de dados em updates parciais;
- testes automatizados.

### Fase 4A — Dashboard e carteira comercial

- Dashboard com indicadores e gráficos.
- Priorização comercial.
- Lista de clientes.
- Busca e filtros.
- Perfil individual inicial.
- Histórico de serviços e produtos.
- Timeline e mensagem sugerida.
- Abertura manual do WhatsApp.

### Fase H — Hardening técnico pré-autenticação

- Contexto temporário de salão centralizado no servidor.
- Todas as consultas e mutações atuais filtradas por `salon_id`.
- Browser removido da escolha do tenant nas importações.
- Validação AVEC repetida no servidor.
- Updates AVEC preservam campos existentes quando a planilha vem vazia.
- Regras de status e nível centralizadas em código e documentação.
- Totais históricos protegidos contra importações detalhadas parciais.
- Checklist de autenticação e RLS preparado.

Pendências intencionais:

- autenticação e autorização por usuário;
- policies RLS por tenant;
- remoção do contexto temporário `SALON_ID`.

## Fase concluída mais recente

### Fase 10A — Preparação para produção e homologação

Objetivo: consolidar documentação operacional, deploy, ambiente, Supabase e QA sem alterar o comportamento da aplicação.

Entregue:

- README completo com instalação, scripts, Supabase, Auth e AVEC;
- guia de deploy e validações pós-publicação;
- guia de variáveis e segurança da service role;
- guia de criação e homologação do projeto Supabase;
- checklist de QA para ambiente, multi-tenant, AVEC, CRM, permissões e auditoria;
- sequência operacional das migrations `001`, `002` e `003`;
- bootstrap documentado do primeiro salão e administrador.

Limitações:

- a fase não executa deploy nem aplica migrations remotamente;
- o repositório ainda não possui `supabase/config.toml`;
- a homologação com Supabase e dados reais permanece pendente.

## Próximas fases

### Fase 10B — QA com Supabase real

- aplicar as migrations em homologação;
- testar dois salões e as quatro roles;
- executar integralmente `docs/QA_CHECKLIST.md`;
- registrar evidências e bloqueadores.

### Fase 10C — Deploy

- configurar ambiente de produção;
- publicar a aplicação;
- validar domínio, HTTPS, Auth e rollback.

### Fase 10D — Teste com dados reais AVEC

- usar cópias controladas e autorizadas dos relatórios;
- validar mapeamento, deduplicação, métricas e desempenho;
- documentar ajustes necessários antes da operação.

### Fase 11A — Convites e gestão de usuários

- criar convite e vínculo controlado;
- recuperação e revogação de acesso;
- evolução da gestão interna.

### Fase 12A — WhatsApp/API futura

- avaliar provedor, consentimento e templates;
- manter envio manual até uma fase explicitamente autorizada.

## Dependências recomendadas entre fases

```text
7A–7C Autenticação e isolamento
  └─ 8A Configurações do Salão
       └─ 8B Usuários internos
            └─ 9A Permissões por função
                 └─ 9B Auditoria básica
                      └─ 10A Preparação para produção
                           └─ 10B QA com Supabase real
                                └─ 10C Deploy
                                     └─ 10D Dados reais AVEC
```

Qualquer publicação com dados reais deve aplicar e homologar as migrations RLS antes de liberar acesso operacional.

O checklist técnico para essas fases está em [authentication-readiness-checklist.md](./authentication-readiness-checklist.md).
