import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { normalizeSupabaseUrl } from '../utils/supabaseSync';

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL ?? '');
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
).trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;
