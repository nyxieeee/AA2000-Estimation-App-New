// Data service factory — localStorage only (Supabase disconnected)
import { DataService } from './index';

let instance: DataService | null = null;

export function getDataService(): DataService {
  if (!instance) {
    instance = new DataService({ useSupabase: false });
  }
  return instance;
}

// Always returns false — Supabase is intentionally disconnected
export function isSupabaseConfigured(): boolean {
  return false;
}

export { DataService };
