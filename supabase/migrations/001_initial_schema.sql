create extension if not exists "pgcrypto";

create table salons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  city text,
  plan text default 'trial',
  created_at timestamptz default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references salons(id) on delete cascade,
  name text not null,
  email text not null,
  role text default 'admin',
  created_at timestamptz default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references salons(id) on delete cascade,
  avec_code text,
  name text not null,
  phone text,
  mobile text,
  email text,
  gender text,
  birth_date date,
  address text,
  city text,
  district text,
  registration_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table professionals (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references salons(id) on delete cascade,
  name text not null,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references salons(id) on delete cascade,
  name text not null,
  category text,
  standard_price numeric(12,2) default 0,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references salons(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  professional_id uuid references professionals(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  appointment_date date not null,
  gross_value numeric(12,2) default 0,
  discount_value numeric(12,2) default 0,
  total_value numeric(12,2) default 0,
  import_source text,
  created_at timestamptz default now()
);

create table product_sales (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references salons(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  product_name text not null,
  brand text,
  category text,
  quantity numeric(12,2) default 1,
  unit_value numeric(12,2) default 0,
  total_value numeric(12,2) default 0,
  sale_date date,
  created_at timestamptz default now()
);

create table client_metrics (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references salons(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  last_visit date,
  total_visits integer default 0,
  total_service_spent numeric(12,2) default 0,
  total_product_spent numeric(12,2) default 0,
  total_spent numeric(12,2) default 0,
  average_ticket numeric(12,2) default 0,
  days_without_visit integer default 0,
  client_status text default 'Sem histórico',
  client_level text default 'Bronze',
  buys_products boolean default false,
  updated_at timestamptz default now(),
  constraint client_metrics_client_id_key unique (client_id)
);

create table follow_ups (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references salons(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  type text,
  title text not null,
  suggested_message text,
  suggested_date date,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references salons(id) on delete cascade,
  name text not null,
  segment text,
  message text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table imports (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references salons(id) on delete cascade,
  file_type text not null,
  file_name text not null,
  total_rows integer default 0,
  imported_rows integer default 0,
  failed_rows integer default 0,
  status text default 'pending',
  imported_at timestamptz default now()
);

create index idx_clients_salon_id on clients(salon_id);
create index idx_clients_mobile on clients(mobile);
create index idx_clients_name on clients(name);
create index idx_appointments_salon_id on appointments(salon_id);
create index idx_appointments_client_id on appointments(client_id);
create index idx_appointments_appointment_date on appointments(appointment_date);
create index idx_product_sales_salon_id on product_sales(salon_id);
create index idx_product_sales_client_id on product_sales(client_id);
create index idx_product_sales_sale_date on product_sales(sale_date);
create index idx_client_metrics_salon_id on client_metrics(salon_id);
create index idx_client_metrics_client_status on client_metrics(client_status);
create index idx_client_metrics_client_level on client_metrics(client_level);
create index idx_follow_ups_salon_id on follow_ups(salon_id);
create index idx_follow_ups_status on follow_ups(status);
create index idx_follow_ups_suggested_date on follow_ups(suggested_date);

create or replace function handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_clients_updated_at
before update on clients
for each row
execute function handle_updated_at();

create trigger set_professionals_updated_at
before update on professionals
for each row
execute function handle_updated_at();

create trigger set_services_updated_at
before update on services
for each row
execute function handle_updated_at();

create trigger set_follow_ups_updated_at
before update on follow_ups
for each row
execute function handle_updated_at();

create trigger set_campaigns_updated_at
before update on campaigns
for each row
execute function handle_updated_at();

alter table salons enable row level security;
alter table users enable row level security;
alter table clients enable row level security;
alter table professionals enable row level security;
alter table services enable row level security;
alter table appointments enable row level security;
alter table product_sales enable row level security;
alter table client_metrics enable row level security;
alter table follow_ups enable row level security;
alter table campaigns enable row level security;
alter table imports enable row level security;

create policy salons_select_authenticated on salons
  for select to authenticated using (true);
create policy salons_insert_authenticated on salons
  for insert to authenticated with check (true);
create policy salons_update_authenticated on salons
  for update to authenticated using (true) with check (true);
create policy salons_delete_authenticated on salons
  for delete to authenticated using (true);

create policy users_select_authenticated on users
  for select to authenticated using (true);
create policy users_insert_authenticated on users
  for insert to authenticated with check (true);
create policy users_update_authenticated on users
  for update to authenticated using (true) with check (true);
create policy users_delete_authenticated on users
  for delete to authenticated using (true);

create policy clients_select_authenticated on clients
  for select to authenticated using (true);
create policy clients_insert_authenticated on clients
  for insert to authenticated with check (true);
create policy clients_update_authenticated on clients
  for update to authenticated using (true) with check (true);
create policy clients_delete_authenticated on clients
  for delete to authenticated using (true);

create policy professionals_select_authenticated on professionals
  for select to authenticated using (true);
create policy professionals_insert_authenticated on professionals
  for insert to authenticated with check (true);
create policy professionals_update_authenticated on professionals
  for update to authenticated using (true) with check (true);
create policy professionals_delete_authenticated on professionals
  for delete to authenticated using (true);

create policy services_select_authenticated on services
  for select to authenticated using (true);
create policy services_insert_authenticated on services
  for insert to authenticated with check (true);
create policy services_update_authenticated on services
  for update to authenticated using (true) with check (true);
create policy services_delete_authenticated on services
  for delete to authenticated using (true);

create policy appointments_select_authenticated on appointments
  for select to authenticated using (true);
create policy appointments_insert_authenticated on appointments
  for insert to authenticated with check (true);
create policy appointments_update_authenticated on appointments
  for update to authenticated using (true) with check (true);
create policy appointments_delete_authenticated on appointments
  for delete to authenticated using (true);

create policy product_sales_select_authenticated on product_sales
  for select to authenticated using (true);
create policy product_sales_insert_authenticated on product_sales
  for insert to authenticated with check (true);
create policy product_sales_update_authenticated on product_sales
  for update to authenticated using (true) with check (true);
create policy product_sales_delete_authenticated on product_sales
  for delete to authenticated using (true);

create policy client_metrics_select_authenticated on client_metrics
  for select to authenticated using (true);
create policy client_metrics_insert_authenticated on client_metrics
  for insert to authenticated with check (true);
create policy client_metrics_update_authenticated on client_metrics
  for update to authenticated using (true) with check (true);
create policy client_metrics_delete_authenticated on client_metrics
  for delete to authenticated using (true);

create policy follow_ups_select_authenticated on follow_ups
  for select to authenticated using (true);
create policy follow_ups_insert_authenticated on follow_ups
  for insert to authenticated with check (true);
create policy follow_ups_update_authenticated on follow_ups
  for update to authenticated using (true) with check (true);
create policy follow_ups_delete_authenticated on follow_ups
  for delete to authenticated using (true);

create policy campaigns_select_authenticated on campaigns
  for select to authenticated using (true);
create policy campaigns_insert_authenticated on campaigns
  for insert to authenticated with check (true);
create policy campaigns_update_authenticated on campaigns
  for update to authenticated using (true) with check (true);
create policy campaigns_delete_authenticated on campaigns
  for delete to authenticated using (true);

create policy imports_select_authenticated on imports
  for select to authenticated using (true);
create policy imports_insert_authenticated on imports
  for insert to authenticated with check (true);
create policy imports_update_authenticated on imports
  for update to authenticated using (true) with check (true);
create policy imports_delete_authenticated on imports
  for delete to authenticated using (true);
