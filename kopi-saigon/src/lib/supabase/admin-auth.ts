import { createClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient, getSupabasePublishableKey } from './admin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cyczyaswxkpdcremqnkn.supabase.co';


export async function requireAdmin(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { error: Response.json({ error: 'Sign in required.' }, { status: 401 }) } as const;

  const authClient = createClient(SUPABASE_URL, getSupabasePublishableKey(), {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user?.email) return { error: Response.json({ error: 'Your session has expired. Sign in again.' }, { status: 401 }) } as const;

  let admin;
  try { admin = createSupabaseAdminClient(); }
  catch (cause) { return { error: Response.json({ error: cause instanceof Error ? cause.message : 'Admin API is not configured.' }, { status: 503 }) } as const; }

  const { data: access, error: accessError } = await admin.from('kopi_app_access').select('enabled, is_admin').eq('user_id', data.user.id).maybeSingle();
  if (accessError) return { error: Response.json({ error: 'Database setup is incomplete. Apply the Kopi Saigon admin migration.' }, { status: 503 }) } as const;
  if (!access || !access.enabled) return { error: Response.json({ error: 'This account is disabled or has no app access.' }, { status: 403 }) } as const;
  if (!access.is_admin) return { error: Response.json({ error: 'This account does not have admin access.' }, { status: 403 }) } as const;

  return { user: data.user, admin } as const;
}
