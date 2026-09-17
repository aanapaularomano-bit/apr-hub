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

export async function makePortalToken(slug: string): Promise<string> {
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
    new TextEncoder().encode(slug)
  );
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(sig))));
}

export async function verifyPortalToken(slug: string, token: string): Promise<boolean> {
  try {
    const expected = await makePortalToken(slug);
    return expected === token;
  } catch {
    return false;
  }
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
