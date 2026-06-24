begin;

-- Fase 10G — Idempotência e limpeza de duplicados em appointments.
--
-- Critério operacional de duplicidade usado pela importação AVEC:
-- salon_id + client_id + service_id + appointment_date + total_value.
--
-- professional_id não entra nesta chave para preservar a regra já usada nos
-- relatórios de duplicados e evitar manter duplicidades antigas causadas por
-- profissional vazio/diferente em reimportações de teste.

with ranked_appointments as (
  select
    id,
    row_number() over (
      partition by salon_id, client_id, service_id, appointment_date, total_value
      order by created_at asc nulls last, id asc
    ) as duplicate_rank
  from public.appointments
)
delete from public.appointments appointments
using ranked_appointments ranked
where appointments.id = ranked.id
  and ranked.duplicate_rank > 1;

create unique index if not exists idx_appointments_import_dedupe_unique
  on public.appointments (
    salon_id,
    client_id,
    service_id,
    appointment_date,
    total_value
  )
  nulls not distinct;

commit;
