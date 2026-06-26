// Core service factory for creating DataService instances
import { DataService } from './index';

let instance: DataService | null = null;

export function getDataService(config?: { useSupabase?: boolean; supabaseUrl?: string; supabaseKey?: string }): DataService {
  if (!instance || (config && (config.useSupabase !== instance.isSupabaseConfigured() || config.supabaseUrl !== import.meta.env.VITE_SUPABASE_URL))) {
    const settings: { useSupabase: boolean; supabaseUrl?: string; supabaseKey?: string } = {
      useSupabase: config?.useSupabase ?? false,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      ...config,
    };

    instance = new DataService(settings);
  }

  return instance;
}

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return instance?.isSupabaseConfigured() ?? false;
}

// Export the service class
export { DataService };
