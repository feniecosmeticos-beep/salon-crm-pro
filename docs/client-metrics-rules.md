# Salon CRM Pro — Regras oficiais de métricas do cliente

> Última revisão: 17 de junho de 2026  
> Fonte executável: `src/lib/client-metrics.ts`

## Objetivo

Este documento define as regras oficiais de `client_status`, `client_level` e `days_without_visit`. Qualquer importação, consulta, relatório ou funcionalidade futura deve reutilizar essas regras, sem criar faixas paralelas.

## `client_status`

As regras são avaliadas nesta ordem:

| Prioridade | Condição | Status |
| --- | --- | --- |
| 1 | Sem `last_visit` ou `total_visits <= 0` | `Sem histórico` |
| 2 | Exatamente 1 visita e até 30 dias sem visita | `Novo` |
| 3 | Até 45 dias sem visita | `Ativo` |
| 4 | De 46 a 89 dias sem visita | `Em risco` |
| 5 | 90 dias ou mais sem visita | `Inativo` |

Consequências de borda:

- 30 dias e uma visita: `Novo`;
- 30 dias e duas ou mais visitas: `Ativo`;
- 45 dias: `Ativo`;
- 46 dias: `Em risco`;
- 89 dias: `Em risco`;
- 90 dias: `Inativo`.

## `days_without_visit`

- A diferença é calculada por dia civil em UTC.
- O horário da execução não altera o resultado dentro do mesmo dia UTC.
- Datas futuras resultam em `0`.
- Data ausente ou inválida resulta em `0`.
- O valor persistido é atualizado durante o recalculo de métricas.
- Nas leituras de dashboard, carteira e perfil, status, nível e dias sem visita são atualizados em memória para evitar classificações vencidas entre importações.

## `client_level`

As regras são avaliadas da maior para a menor faixa. Basta atender ao critério de gasto **ou** ao critério de visitas.

| Prioridade | Condição | Nível |
| --- | --- | --- |
| 1 | `total_spent >= 3000` ou `total_visits > 15` | `Diamante` |
| 2 | `total_spent >= 1500` ou `total_visits > 10` | `Ouro` |
| 3 | `total_spent >= 700` ou `total_visits > 5` | `Prata` |
| 4 | Demais casos | `Bronze` |

Consequências de borda:

- R$ 700,00: `Prata`;
- R$ 1.500,00: `Ouro`;
- R$ 3.000,00: `Diamante`;
- 5 visitas ainda não elevam o nível por quantidade;
- 6 visitas: no mínimo `Prata`;
- 11 visitas: no mínimo `Ouro`;
- 16 visitas: `Diamante`.

Valores negativos de gasto ou visitas são tratados como zero para classificação.

## Valores usados no recalculo

```text
visitas detalhadas = quantidade de appointments do cliente
visitas oficiais = maior valor entre visitas detalhadas e total_visits anterior

gasto detalhado em serviços = soma de appointments.total_value
gasto oficial em serviços = maior valor entre gasto detalhado e total_service_spent anterior

gasto em produtos = soma de product_sales.total_value
gasto total = gasto oficial em serviços + gasto em produtos
ticket médio = gasto total / visitas oficiais, quando visitas oficiais > 0
última visita = data mais recente entre appointments e last_visit anterior
compra produtos = gasto em produtos > 0
```

O uso do maior valor para visitas e serviços evita perder totais históricos quando o relatório “Clientes atendidos” possui dados agregados, mas apenas parte dos atendimentos detalhados foi importada.

## Pontos ainda dependentes de evolução do banco

- O banco ainda usa campos `text`, sem `CHECK` ou enum para status e nível.
- Não existe trigger SQL para recalcular métricas.
- A aplicação continua sendo a fonte das regras de classificação.
- Alterações futuras nas faixas devem modificar primeiro `src/lib/client-metrics.ts`, depois este documento e os testes correspondentes.

