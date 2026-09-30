import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getSupabaseProjectReader } from '../../../lib/supabaseAdmin';

export async function GET() {
  try {
    const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? getSupabaseAdmin() : getSupabaseProjectReader();
    const { data, error } = await db.from('map_projects').select('*').order('updated_at', { ascending: false });
    if (error) {
      console.error('Supabase project list query failed:', { code: error.code, message: error.message });
      const detail = error.code === '42501'
        ? 'Supabase denied project reads. Apply migration 202609300002_restore_public_project_reads.sql.'
        : 'Could not read Atlas projects. Check the Supabase URL, public key, and read policy.';
      return NextResponse.json({ error: detail }, { status: 503 });
    }
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Supabase project list connection failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Could not connect to Supabase. Check server configuration.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload.name !== 'string') return NextResponse.json({ error: 'Invalid project.' }, { status: 400 });
  try {
    const { data, error } = await getSupabaseAdmin().from('map_projects').insert([payload]).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch { return NextResponse.json({ error: 'Could not create project.' }, { status: 503 }); }
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== 'string' || !body.payload || typeof body.payload !== 'object') return NextResponse.json({ error: 'Invalid project update.' }, { status: 400 });
  const payload = { ...body.payload };
  delete payload.id; delete payload.created_at;
  try {
    const { data, error } = await getSupabaseAdmin().from('map_projects').update(payload).eq('id', body.id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Could not save project.' }, { status: 503 }); }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Project id is required.' }, { status: 400 });
  try {
    const db = getSupabaseAdmin();
    await db.from('project_view_links').update({ revoked_at: new Date().toISOString() }).eq('project_id', id);
    const { error } = await db.from('map_projects').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Could not delete project.' }, { status: 503 }); }
}
