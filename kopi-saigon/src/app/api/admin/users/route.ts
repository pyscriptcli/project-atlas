import { requireAdmin } from '@/lib/supabase/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const context = await requireAdmin(request);
  if ('error' in context) return context.error;
  const users = [];
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await context.admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return Response.json({ error: error.message }, { status: 502 });
    users.push(...data.users);
    if (data.users.length < 200) break;
  }
  const clientUsers = users.filter(user => user.email);
  const userIds = clientUsers.map(user => user.id);
  const accessByUser = new Map<string, { enabled: boolean; isAdmin: boolean }>();
  for (let start = 0; start < userIds.length; start += 200) {
    const { data, error } = await context.admin.from('kopi_app_access').select('user_id, enabled, is_admin').in('user_id', userIds.slice(start, start + 200));
    if (error) return Response.json({ error: 'Could not load account access records.' }, { status: 502 });
    for (const access of data || []) accessByUser.set(access.user_id, { enabled: access.enabled, isAdmin: access.is_admin });
  }
  return Response.json({ users: clientUsers.map(user => {
    const email = user.email || '';
    const access = accessByUser.get(user.id);
    const isAdmin = access?.isAdmin === true;
    const isBanned = Boolean(user.banned_until && Date.parse(user.banned_until) > Date.now());
    const accessEnabled = access?.enabled === true;
    return { id: user.id, email, name: typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : '', createdAt: user.created_at, lastSignInAt: user.last_sign_in_at, emailConfirmed: Boolean(user.email_confirmed_at), isAdmin, enabled: isAdmin ? !isBanned : accessEnabled && !isBanned, status: isBanned || (!isAdmin && !accessEnabled) ? 'suspended' : user.email_confirmed_at ? 'active' : 'invited' };
  }) });
}

export async function POST(request: Request) {
  const context = await requireAdmin(request);
  if ('error' in context) return context.error;
  let body: { email?: unknown; name?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://kopisaigon.vercel.app').replace(/\/$/, '');
  const { data, error } = await context.admin.auth.admin.inviteUserByEmail(email, { data: name ? { display_name: name } : {}, redirectTo: `${siteUrl}/auth/setup-password` });
  if (error || !data.user) return Response.json({ error: error?.message || 'Could not send the invitation.' }, { status: 400 });
  const { error: accessError } = await context.admin.from('kopi_app_access').insert({ user_id: data.user.id, enabled: true, is_admin: false, granted_by: context.user.id });
  if (accessError) {
    await context.admin.auth.admin.deleteUser(data.user.id);
    return Response.json({ error: 'The invitation was sent but account access could not be initialized. Check the database migration.' }, { status: 503 });
  }
  await context.admin.from('kopi_admin_audit_events').insert({ admin_user_id: context.user.id, action: 'invite_user', target_user_id: data.user.id });
  return Response.json({ user: { id: data.user.id, email, name, status: 'invited' } }, { status: 201 });
}
