begin;

create or replace function public.current_user_salon_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog
as $$
  with auth_identity as (
    select
      auth.uid() as user_id,
      nullif(lower(auth.jwt() ->> 'email'), '') as email
  ),
  id_match as (
    select app_user.salon_id
    from public.users as app_user
    cross join auth_identity
    where auth_identity.user_id is not null
      and app_user.id = auth_identity.user_id
      and app_user.salon_id is not null
    limit 1
  ),
  email_match as (
    select app_user.salon_id
    from public.users as app_user
    cross join auth_identity
    where auth_identity.email is not null
      and lower(app_user.email) = auth_identity.email
      and app_user.salon_id is not null
      and not exists (
        select 1
        from public.users as duplicate_user
        where duplicate_user.id <> app_user.id
          and lower(duplicate_user.email) = auth_identity.email
      )
    limit 1
  )
  select coalesce(
    (select id_match.salon_id from id_match),
    (select email_match.salon_id from email_match)
  );
$$;

comment on function public.current_user_salon_id() is
  'Returns the authenticated user salon. Prefers public.users.id = auth.uid() and falls back to a unique email match from auth.jwt().';

revoke all on function public.current_user_salon_id() from public;
revoke all on function public.current_user_salon_id() from anon;
grant execute on function public.current_user_salon_id() to authenticated;

alter table public.salons enable row level security;
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.professionals enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.product_sales enable row level security;
alter table public.client_metrics enable row level security;
alter table public.follow_ups enable row level security;
alter table public.campaigns enable row level security;
alter table public.imports enable row level security;

drop policy if exists salons_select_authenticated on public.salons;
drop policy if exists salons_insert_authenticated on public.salons;
drop policy if exists salons_update_authenticated on public.salons;
drop policy if exists salons_delete_authenticated on public.salons;
drop policy if exists salons_select_own_salon on public.salons;
drop policy if exists salons_update_own_salon on public.salons;

drop policy if exists users_select_authenticated on public.users;
drop policy if exists users_insert_authenticated on public.users;
drop policy if exists users_update_authenticated on public.users;
drop policy if exists users_delete_authenticated on public.users;
drop policy if exists users_select_own_salon on public.users;
drop policy if exists users_insert_own_salon on public.users;
drop policy if exists users_update_own_salon on public.users;
drop policy if exists users_delete_own_salon on public.users;

drop policy if exists clients_select_authenticated on public.clients;
drop policy if exists clients_insert_authenticated on public.clients;
drop policy if exists clients_update_authenticated on public.clients;
drop policy if exists clients_delete_authenticated on public.clients;
drop policy if exists clients_select_own_salon on public.clients;
drop policy if exists clients_insert_own_salon on public.clients;
drop policy if exists clients_update_own_salon on public.clients;
drop policy if exists clients_delete_own_salon on public.clients;

drop policy if exists professionals_select_authenticated on public.professionals;
drop policy if exists professionals_insert_authenticated on public.professionals;
drop policy if exists professionals_update_authenticated on public.professionals;
drop policy if exists professionals_delete_authenticated on public.professionals;
drop policy if exists professionals_select_own_salon on public.professionals;
drop policy if exists professionals_insert_own_salon on public.professionals;
drop policy if exists professionals_update_own_salon on public.professionals;
drop policy if exists professionals_delete_own_salon on public.professionals;

drop policy if exists services_select_authenticated on public.services;
drop policy if exists services_insert_authenticated on public.services;
drop policy if exists services_update_authenticated on public.services;
drop policy if exists services_delete_authenticated on public.services;
drop policy if exists services_select_own_salon on public.services;
drop policy if exists services_insert_own_salon on public.services;
drop policy if exists services_update_own_salon on public.services;
drop policy if exists services_delete_own_salon on public.services;

drop policy if exists appointments_select_authenticated on public.appointments;
drop policy if exists appointments_insert_authenticated on public.appointments;
drop policy if exists appointments_update_authenticated on public.appointments;
drop policy if exists appointments_delete_authenticated on public.appointments;
drop policy if exists appointments_select_own_salon on public.appointments;
drop policy if exists appointments_insert_own_salon on public.appointments;
drop policy if exists appointments_update_own_salon on public.appointments;
drop policy if exists appointments_delete_own_salon on public.appointments;

drop policy if exists product_sales_select_authenticated on public.product_sales;
drop policy if exists product_sales_insert_authenticated on public.product_sales;
drop policy if exists product_sales_update_authenticated on public.product_sales;
drop policy if exists product_sales_delete_authenticated on public.product_sales;
drop policy if exists product_sales_select_own_salon on public.product_sales;
drop policy if exists product_sales_insert_own_salon on public.product_sales;
drop policy if exists product_sales_update_own_salon on public.product_sales;
drop policy if exists product_sales_delete_own_salon on public.product_sales;

drop policy if exists client_metrics_select_authenticated on public.client_metrics;
drop policy if exists client_metrics_insert_authenticated on public.client_metrics;
drop policy if exists client_metrics_update_authenticated on public.client_metrics;
drop policy if exists client_metrics_delete_authenticated on public.client_metrics;
drop policy if exists client_metrics_select_own_salon on public.client_metrics;
drop policy if exists client_metrics_insert_own_salon on public.client_metrics;
drop policy if exists client_metrics_update_own_salon on public.client_metrics;
drop policy if exists client_metrics_delete_own_salon on public.client_metrics;

drop policy if exists follow_ups_select_authenticated on public.follow_ups;
drop policy if exists follow_ups_insert_authenticated on public.follow_ups;
drop policy if exists follow_ups_update_authenticated on public.follow_ups;
drop policy if exists follow_ups_delete_authenticated on public.follow_ups;
drop policy if exists follow_ups_select_own_salon on public.follow_ups;
drop policy if exists follow_ups_insert_own_salon on public.follow_ups;
drop policy if exists follow_ups_update_own_salon on public.follow_ups;
drop policy if exists follow_ups_delete_own_salon on public.follow_ups;

drop policy if exists campaigns_select_authenticated on public.campaigns;
drop policy if exists campaigns_insert_authenticated on public.campaigns;
drop policy if exists campaigns_update_authenticated on public.campaigns;
drop policy if exists campaigns_delete_authenticated on public.campaigns;
drop policy if exists campaigns_select_own_salon on public.campaigns;
drop policy if exists campaigns_insert_own_salon on public.campaigns;
drop policy if exists campaigns_update_own_salon on public.campaigns;
drop policy if exists campaigns_delete_own_salon on public.campaigns;

drop policy if exists imports_select_authenticated on public.imports;
drop policy if exists imports_insert_authenticated on public.imports;
drop policy if exists imports_update_authenticated on public.imports;
drop policy if exists imports_delete_authenticated on public.imports;
drop policy if exists imports_select_own_salon on public.imports;
drop policy if exists imports_insert_own_salon on public.imports;
drop policy if exists imports_update_own_salon on public.imports;
drop policy if exists imports_delete_own_salon on public.imports;

create policy salons_select_own_salon on public.salons
  for select
  to authenticated
  using (id = (select public.current_user_salon_id()));

create policy salons_update_own_salon on public.salons
  for update
  to authenticated
  using (id = (select public.current_user_salon_id()))
  with check (id = (select public.current_user_salon_id()));

create policy users_select_own_salon on public.users
  for select
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy users_insert_own_salon on public.users
  for insert
  to authenticated
  with check (salon_id = (select public.current_user_salon_id()));

create policy users_update_own_salon on public.users
  for update
  to authenticated
  using (salon_id = (select public.current_user_salon_id()))
  with check (salon_id = (select public.current_user_salon_id()));

create policy users_delete_own_salon on public.users
  for delete
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy clients_select_own_salon on public.clients
  for select
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy clients_insert_own_salon on public.clients
  for insert
  to authenticated
  with check (salon_id = (select public.current_user_salon_id()));

create policy clients_update_own_salon on public.clients
  for update
  to authenticated
  using (salon_id = (select public.current_user_salon_id()))
  with check (salon_id = (select public.current_user_salon_id()));

create policy clients_delete_own_salon on public.clients
  for delete
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy professionals_select_own_salon on public.professionals
  for select
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy professionals_insert_own_salon on public.professionals
  for insert
  to authenticated
  with check (salon_id = (select public.current_user_salon_id()));

create policy professionals_update_own_salon on public.professionals
  for update
  to authenticated
  using (salon_id = (select public.current_user_salon_id()))
  with check (salon_id = (select public.current_user_salon_id()));

create policy professionals_delete_own_salon on public.professionals
  for delete
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy services_select_own_salon on public.services
  for select
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy services_insert_own_salon on public.services
  for insert
  to authenticated
  with check (salon_id = (select public.current_user_salon_id()));

create policy services_update_own_salon on public.services
  for update
  to authenticated
  using (salon_id = (select public.current_user_salon_id()))
  with check (salon_id = (select public.current_user_salon_id()));

create policy services_delete_own_salon on public.services
  for delete
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy appointments_select_own_salon on public.appointments
  for select
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy appointments_insert_own_salon on public.appointments
  for insert
  to authenticated
  with check (salon_id = (select public.current_user_salon_id()));

create policy appointments_update_own_salon on public.appointments
  for update
  to authenticated
  using (salon_id = (select public.current_user_salon_id()))
  with check (salon_id = (select public.current_user_salon_id()));

create policy appointments_delete_own_salon on public.appointments
  for delete
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy product_sales_select_own_salon on public.product_sales
  for select
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy product_sales_insert_own_salon on public.product_sales
  for insert
  to authenticated
  with check (salon_id = (select public.current_user_salon_id()));

create policy product_sales_update_own_salon on public.product_sales
  for update
  to authenticated
  using (salon_id = (select public.current_user_salon_id()))
  with check (salon_id = (select public.current_user_salon_id()));

create policy product_sales_delete_own_salon on public.product_sales
  for delete
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy client_metrics_select_own_salon on public.client_metrics
  for select
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy client_metrics_insert_own_salon on public.client_metrics
  for insert
  to authenticated
  with check (salon_id = (select public.current_user_salon_id()));

create policy client_metrics_update_own_salon on public.client_metrics
  for update
  to authenticated
  using (salon_id = (select public.current_user_salon_id()))
  with check (salon_id = (select public.current_user_salon_id()));

create policy client_metrics_delete_own_salon on public.client_metrics
  for delete
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy follow_ups_select_own_salon on public.follow_ups
  for select
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy follow_ups_insert_own_salon on public.follow_ups
  for insert
  to authenticated
  with check (salon_id = (select public.current_user_salon_id()));

create policy follow_ups_update_own_salon on public.follow_ups
  for update
  to authenticated
  using (salon_id = (select public.current_user_salon_id()))
  with check (salon_id = (select public.current_user_salon_id()));

create policy follow_ups_delete_own_salon on public.follow_ups
  for delete
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy campaigns_select_own_salon on public.campaigns
  for select
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy campaigns_insert_own_salon on public.campaigns
  for insert
  to authenticated
  with check (salon_id = (select public.current_user_salon_id()));

create policy campaigns_update_own_salon on public.campaigns
  for update
  to authenticated
  using (salon_id = (select public.current_user_salon_id()))
  with check (salon_id = (select public.current_user_salon_id()));

create policy campaigns_delete_own_salon on public.campaigns
  for delete
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy imports_select_own_salon on public.imports
  for select
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

create policy imports_insert_own_salon on public.imports
  for insert
  to authenticated
  with check (salon_id = (select public.current_user_salon_id()));

create policy imports_update_own_salon on public.imports
  for update
  to authenticated
  using (salon_id = (select public.current_user_salon_id()))
  with check (salon_id = (select public.current_user_salon_id()));

create policy imports_delete_own_salon on public.imports
  for delete
  to authenticated
  using (salon_id = (select public.current_user_salon_id()));

commit;
