begin;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  user_email text,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

create index idx_audit_logs_salon_id on public.audit_logs(salon_id);
create index idx_audit_logs_user_id on public.audit_logs(user_id);
create index idx_audit_logs_action on public.audit_logs(action);
create index idx_audit_logs_created_at on public.audit_logs(created_at);

alter table public.audit_logs enable row level security;

create policy audit_logs_select_own_salon on public.audit_logs
  for select
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy audit_logs_insert_own_salon on public.audit_logs
  for insert
  to authenticated
  with check (salon_id = (select public.current_user_salon_id()));

grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;

commit;
