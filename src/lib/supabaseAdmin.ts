import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://cyczyaswxkpdcremqnkn.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_pUppHGjwmT1mLlhWGZH6Og_4GcCLCPR';

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server credentials are not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// The public key can only read projects covered by the database's SELECT policy.
// Keep project browsing available in local previews without a service-role secret.
export function getSupabaseProjectReader() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
