const COOKIE = 'atlas_editor_session';
const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fromBase64Url(value: string) {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function signature(value: string) {
  const secret = process.env.ATLAS_SESSION_SECRET;
  if (!secret) throw new Error('ATLAS_SESSION_SECRET is not configured');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

export async function createEditorSession(email: string) {
  const payload = toBase64Url(encoder.encode(JSON.stringify({ email, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })));
  return `${payload}.${await signature(payload)}`;
}

export async function verifyEditorSession(token?: string | null) {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  try {
    if ((await signature(payload)) !== sig) return null;
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    return data.exp > Date.now() && typeof data.email === 'string' ? data.email as string : null;
  } catch {
    return null;
  }
}

export const editorCookieName = COOKIE;
