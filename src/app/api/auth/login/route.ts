import { NextRequest, NextResponse } from 'next/server';
import { createEditorSession, editorCookieName } from '../../../../lib/editorSession';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json().catch(() => ({}));
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@primephilippines\.com$/.test(cleanEmail) || !process.env.ATLAS_EDITOR_PASSWORD || password !== process.env.ATLAS_EDITOR_PASSWORD) {
    return NextResponse.json({ error: 'Use your @primephilippines.com email and the editor password.' }, { status: 401 });
  }
  try {
    const token = await createEditorSession(cleanEmail);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(editorCookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 });
    return response;
  } catch {
    return NextResponse.json({ error: 'Editor login is not configured on the server.' }, { status: 503 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(editorCookieName, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
  return response;
}
