export type RelayStatus = "healthy" | "down" | "disabled";

export interface Relay {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  status: RelayStatus;
  daily_limit: number;
  sent_today: number;
  last_used_at: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}