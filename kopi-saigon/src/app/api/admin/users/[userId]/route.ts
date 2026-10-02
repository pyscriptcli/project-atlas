import { requireAdmin } from '@/lib/supabase/admin-auth';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, contextParams: { params: Promise<{ userId: string }> }) {
  const context = await requireAdmin(request);
  if ('error' in context) return context.error;
  const { userId } = await contextParams.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) return Response.json({ error: 'Invalid account ID.' }, { status: 400 });
  let body: { enabled?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid request body.' }, { status: 400 }); }
  if (typeof body.enabled !== 'boolean') return Response.json({ error: 'Choose whether the account should be enabled.' }, { status: 400 });

  const { data: targetResult, error: targetError } = await context.admin.auth.admin.getUserById(userId);
  const target = targetResult.user;
  if (targetError || !target?.email) return Response.json({ error: 'Account not found.' }, { status: 404 });
  if (context.allowedEmails.has(target.email.toLowerCase())) return Response.json({ error: 'Admin accounts cannot be changed here.' }, { status: 403 });
  if (body.enabled) {
    const { error } = await context.admin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
    if (error) return Response.json({ error: error.message }, { status: 502 });
  }
  const { error: accessError } = await context.admin.from('kopi_app_access').upsert({ user_id: userId, enabled: body.enabled, granted_by: context.user.id }, { onConflict: 'user_id' });
  if (accessError) return Response.json({ error: 'Could not update account access. Confirm the database migration is applied.' }, { status: 503 });
  if (!body.enabled) {
    const { error } = await context.admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
    if (error) return Response.json({ error: 'App access is disabled, but the Auth ban failed: ' + error.message }, { status: 502 });
  }
  await context.admin.from('kopi_admin_audit_events').insert({ admin_user_id: context.user.id, action: body.enabled ? 'enable_user' : 'disable_user', target_user_id: userId });
  return Response.json({ ok: true, enabled: body.enabled });
}
