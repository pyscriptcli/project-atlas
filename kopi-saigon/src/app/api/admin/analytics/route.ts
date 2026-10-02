import { requireAdmin } from '@/lib/supabase/admin-auth';

export const dynamic = 'force-dynamic';
const FEATURE_EVENTS = new Set(['area_selected', 'tier_selected', 'display_mode_changed', 'map_mode_changed', 'price_table_opened']);

export async function GET(request: Request) {
  const context = await requireAdmin(request);
  if ('error' in context) return context.error;
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [usersResult, eventResult] = await Promise.all([
    context.admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    context.admin.from('kopi_activity_events').select('user_id, session_id, event_name, event_properties, created_at').gte('created_at', since30).order('created_at', { ascending: false }).limit(10000),
  ]);
  if (usersResult.error) return Response.json({ error: usersResult.error.message }, { status: 502 });
  if (eventResult.error) return Response.json({ error: 'Could not load activity. Confirm the database migration is applied.' }, { status: 503 });
  const clients = usersResult.data.users.filter(user => user.email && !context.allowedEmails.has(user.email.toLowerCase()));
  const clientIds = new Set(clients.map(user => user.id));
  const events = (eventResult.data || []).filter(event => clientIds.has(event.user_id));
  const active7 = new Set(events.filter(event => event.created_at >= since7).map(event => event.user_id));
  const sessionEvents = events.filter(event => event.event_name === 'session_started');
  const sessions = new Set(sessionEvents.map(event => event.session_id));
  const perSession = new Map<string, { first: number; last: number; started: boolean }>();
  for (const event of events) {
    const stamp = Date.parse(event.created_at);
    const stats = perSession.get(event.session_id) || { first: stamp, last: stamp, started: false };
    stats.first = Math.min(stats.first, stamp); stats.last = Math.max(stats.last, stamp);
    stats.started ||= event.event_name === 'session_started';
    perSession.set(event.session_id, stats);
  }
  const durations = Array.from(perSession.values()).filter(item => item.started).map(item => Math.min(600, Math.max(0, Math.round((item.last - item.first) / 60000)))).sort((a, b) => a - b);
  const medianSessionMinutes = durations.length ? durations[Math.floor((durations.length - 1) / 2)] : 0;
  const features = new Map<string, number>();
  for (const event of events) if (FEATURE_EVENTS.has(event.event_name)) features.set(event.event_name, (features.get(event.event_name) || 0) + 1);
  const dayKeys = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(); date.setUTCDate(date.getUTCDate() - (13 - index)); return date.toISOString().slice(0, 10);
  });
  const daily = dayKeys.map(day => ({ day, sessions: sessionEvents.filter(event => event.created_at.slice(0, 10) === day).length }));
  const emailById = new Map(clients.map(user => [user.id, user.email || 'Unknown account']));
  const recent = events.slice(0, 16).map(event => ({ email: emailById.get(event.user_id) || 'Unknown account', event: event.event_name, properties: event.event_properties, createdAt: event.created_at }));
  return Response.json({
    clientAccounts: clients.length, activeAccounts7d: active7.size, sessions30d: sessions.size,
    medianSessionMinutes, neverSignedIn: clients.filter(user => !user.last_sign_in_at).length,
    totalEvents30d: events.filter(event => event.event_name !== 'session_heartbeat').length,
    dailySessions: daily, featureUsage: Array.from(features, ([event, count]) => ({ event, count })).sort((a, b) => b.count - a.count), recentActivity: recent,
  });
}
