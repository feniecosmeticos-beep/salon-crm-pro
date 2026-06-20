import type { Client, ClientMetrics } from "@/types/database";

export type ClientListItem = {
  client: Client;
  metrics: ClientMetrics | null;
};
