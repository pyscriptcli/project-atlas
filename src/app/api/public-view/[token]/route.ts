import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: 'Viewer link not found.' }, { status: 404 });
    const { data, error } = await getSupabaseAdmin().from('project_view_links').select('project_name,snapshot,navigation,updated_at').eq('token', token).is('revoked_at', null).maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'Viewer link not found or revoked.' }, { status: 404 });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch {
    return NextResponse.json({ error: 'Viewer service is not configured.' }, { status: 503 });
  }
}
