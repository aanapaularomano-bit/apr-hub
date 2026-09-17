// Portal authentication helpers — uses Web Crypto (no extra deps)

// ── Password hashing (PBKDF2) ─────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const saltB64 = btoa(String.fromCharCode(...Array.from(salt)));
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  const hashB64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(bits))));
  return `pbkdf2:${saltB64}:${hashB64}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split(':');
    if (parts.length !== 3 || parts[0] !== 'pbkdf2') return false;
    const salt = new Uint8Array(
      atob(parts[1]).split('').map(c => c.charCodeAt(0))
    );
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await globalThis.crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      key,
      256
    );
    const hashB64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(bits))));
    return hashB64 === parts[2];
  } catch {
    return false;
  }
}

// ── Session token (HMAC-SHA256) ───────────────────────────────────────────────
// Cookie value format: "${role}:${base64_hmac}"
// HMAC is signed over "${slug}:${role}"

export async function makePortalToken(slug: string, role: 'client' | 'admin' = 'client'): Promise<string> {
  const secret = (process.env.APR_AUTH_SECRET || 'apr-hub-token') + ':portal';
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${slug}:${role}`)
  );
  const hmac = btoa(String.fromCharCode(...Array.from(new Uint8Array(sig))));
  return `${role}:${hmac}`;
}

export async function getPortalRole(slug: string, cookieValue: string): Promise<'client' | 'admin' | null> {
  try {
    const colonIdx = cookieValue.indexOf(':');
    if (colonIdx === -1) return null;
    const role = cookieValue.slice(0, colonIdx) as 'client' | 'admin';
    if (role !== 'client' && role !== 'admin') return null;
    const hmac = cookieValue.slice(colonIdx + 1);
    const expected = await makePortalToken(slug, role);
    const expectedHmac = expected.slice(expected.indexOf(':') + 1);
    return hmac === expectedHmac ? role : null;
  } catch {
    return null;
  }
}

export async function verifyPortalToken(slug: string, cookieValue: string): Promise<boolean> {
  return (await getPortalRole(slug, cookieValue)) !== null;
}

// Cookie name per portal slug (slug chars: a-z, 0-9, -)
export function portalCookieName(slug: string): string {
  return 'portal_' + slug.replace(/-/g, '_');
}

// ── Password generator ────────────────────────────────────────────────────────

export function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const arr = globalThis.crypto.getRandomValues(new Uint8Array(12));
  return Array.from(arr).map(b => chars[b % chars.length]).join('');
}

// ── Slug helper ───────────────────────────────────────────────────────────────

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}
