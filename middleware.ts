import { NextRequest, NextResponse } from 'next/server';
import { verifyEditorSession, editorCookieName } from './src/lib/editorSession';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith('/view/') || path.startsWith('/api/public-view/') || path === '/api/auth/login' || path === '/api/gis/token' || path.startsWith('/_next/') || path === '/favicon.ico') return NextResponse.next();
  if (process.env.ATLAS_EDITOR_AUTH_ENABLED !== 'true') {
    return path === '/login' ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
  }
  const email = await verifyEditorSession(request.cookies.get(editorCookieName)?.value);
  if (email) {
    if (path === '/login') return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  }
  if (path.startsWith('/api/')) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  if (path !== '/login') return NextResponse.redirect(new URL('/login', request.url));
  return NextResponse.next();
}

export const config = { matcher: ['/((?!.*\\.(?:png|jpg|jpeg|gif|svg|css|js|ico|woff2?)$).*)'] };
