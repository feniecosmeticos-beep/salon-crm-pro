export type ClientStatus =
  | "Novo"
  | "Ativo"
  | "Em risco"
  | "Inativo"
  | "Sem histórico";

export type ClientLevel = "Diamante" | "Ouro" | "Prata" | "Bronze";

export type FollowUpStatus = "pending" | "done" | "cancelled";

export type JsonValue =
  | boolean
  | number
  | string
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface Salon {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  plan: string | null;
  created_at: string;
}

export interface AppUser {
  id: string;
  salon_id: string | null;
  name: string;
  email: string;
  role: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  salon_id: string | null;
  avec_code: string | null;
  name: string;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  gender: string | null;
  birth_date: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  registration_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Professional {
  id: string;
  salon_id: string | null;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  salon_id: string | null;
  name: string;
  category: string | null;
  standard_price: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  salon_id: string | null;
  client_id: string | null;
  professional_id: string | null;
  service_id: string | null;
  appointment_date: string;
  gross_value: number;
  discount_value: number;
  total_value: number;
  import_source: string | null;
  created_at: string;
}

export interface ProductSale {
  id: string;
  salon_id: string | null;
  client_id: string | null;
  product_name: string;
  brand: string | null;
  category: string | null;
  quantity: number;
  unit_value: number;
  total_value: number;
  sale_date: string | null;
  created_at: string;
}

export interface ClientMetrics {
  id: string;
  salon_id: string | null;
  client_id: string | null;
  last_visit: string | null;
  total_visits: number;
  total_service_spent: number;
  total_product_spent: number;
  total_spent: number;
  average_ticket: number;
  days_without_visit: number;
  client_status: ClientStatus;
  client_level: ClientLevel;
  buys_products: boolean;
  updated_at: string;
}

export interface FollowUp {
  id: string;
  salon_id: string | null;
  client_id: string | null;
  type: string | null;
  title: string;
  suggested_message: string | null;
  suggested_date: string | null;
  status: FollowUpStatus;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  salon_id: string | null;
  name: string;
  segment: string | null;
  message: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ImportLog {
  id: string;
  salon_id: string | null;
  file_type: string;
  file_name: string;
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  status: string | null;
  imported_at: string;
}

export interface AuditLog {
  id: string;
  salon_id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: JsonValue;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

type TableRow<Row> = Row & Record<string, unknown>;

type TableDefinition<Row> = {
  Row: TableRow<Row>;
  Insert: Partial<TableRow<Row>>;
  Update: Partial<TableRow<Row>>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      salons: TableDefinition<Salon>;
      users: TableDefinition<AppUser>;
      clients: TableDefinition<Client>;
      professionals: TableDefinition<Professional>;
      services: TableDefinition<Service>;
      appointments: TableDefinition<Appointment>;
      product_sales: TableDefinition<ProductSale>;
      client_metrics: TableDefinition<ClientMetrics>;
      follow_ups: TableDefinition<FollowUp>;
      campaigns: TableDefinition<Campaign>;
      imports: TableDefinition<ImportLog>;
      audit_logs: TableDefinition<AuditLog>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
