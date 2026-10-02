import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cyczyaswxkpdcremqnkn.supabase.co';

export function createSupabaseAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) throw new Error('Admin API is not configured. Add SUPABASE_SECRET_KEY in the server environment.');
  return createClient(SUPABASE_URL, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export function getSupabasePublishableKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_pUppHGjwmT1mLlhWGZH6Og_4GcCLCPR';
}
