import { createSupabaseBrowserClient } from './supabase/client';

export type ActivityEventName =
  | 'session_started'
  | 'session_heartbeat'
  | 'project_loaded'
  | 'project_load_failed'
  | 'area_selected'
  | 'tier_selected'
  | 'display_mode_changed'
  | 'map_mode_changed'
  | 'price_table_opened'
  | 'signed_out';

const SESSION_KEY = 'kopi-activity-session';

export function startActivitySession() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(SESSION_KEY, window.crypto.randomUUID());
}

function getActivitySessionId() {
  let id = window.sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = window.crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export async function trackActivity(eventName: ActivityEventName, properties: Record<string, string | number | boolean> = {}) {
  if (typeof window === 'undefined') return;
  try {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('kopi_activity_events').insert({ user_id: user.id, session_id: getActivitySessionId(), event_name: eventName, event_properties: properties });
  } catch {
    // Activity collection must never interrupt the viewer.
  }
}
