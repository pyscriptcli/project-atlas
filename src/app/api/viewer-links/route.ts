import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { verifyEditorSession, editorCookieName } from '../../../lib/editorSession';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

async function requireEditor(request: NextRequest) {
  if (process.env.ATLAS_EDITOR_AUTH_ENABLED !== 'true') return true;
  return verifyEditorSession(request.cookies.get(editorCookieName)?.value);
}

export async function GET(request: NextRequest) {
  if (!await requireEditor(request)) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const projectId = request.nextUrl.searchParams.get('project_id');
  if (!projectId) return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
  try {
    const { data, error } = await getSupabaseAdmin().from('project_view_links').select('token,project_name,snapshot,navigation,updated_at,revoked_at').eq('project_id', projectId).maybeSingle();
    if (error) throw error;
    return NextResponse.json(data);
  } catch { return NextResponse.json({ error: 'Viewer links are not configured.' }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  if (!await requireEditor(request)) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.project_id !== 'string' || typeof body.project_name !== 'string' || !body.snapshot || !Array.isArray(body.navigation)) return NextResponse.json({ error: 'Invalid publish data.' }, { status: 400 });
  try {
    const db = getSupabaseAdmin();
    const { data: project, error: projectError } = await db.from('map_projects').select('id').eq('id', body.project_id).maybeSingle();
    if (projectError || !project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    const { data: existing } = await db.from('project_view_links').select('token').eq('project_id', body.project_id).maybeSingle();
    const token = existing?.token || randomBytes(32).toString('hex');
    const { error } = await db.from('project_view_links').upsert({ project_id: body.project_id, token, project_name: body.project_name.slice(0, 120), snapshot: body.snapshot, navigation: body.navigation, revoked_at: null, updated_at: new Date().toISOString() }, { onConflict: 'project_id' });
    if (error) throw error;
    return NextResponse.json({ token, url: `${request.nextUrl.origin}/view/${token}` });
  } catch { return NextResponse.json({ error: 'Could not publish. Apply the Atlas viewer database migration and server credentials.' }, { status: 503 }); }
}

export async function DELETE(request: NextRequest) {
  if (!await requireEditor(request)) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const { project_id } = await request.json().catch(() => ({}));
  if (typeof project_id !== 'string') return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
  try {
    const { error } = await getSupabaseAdmin().from('project_view_links').update({ revoked_at: new Date().toISOString() }).eq('project_id', project_id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Could not revoke viewer link.' }, { status: 503 }); }
}
