/**
 * Security helpers for URL sanitization, token plausibility checks, and safe external navigation.
 */

/**
 * Returns true when token looks like a JWT (header.payload.signature with base64url-safe chars).
 */
export function isPlausibleJwt(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  return parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part) && part.length > 0);
}

/**
 * Converts any string to a trusted external URL (http/https only), else returns null.
 */
export function toSafeHttpUrl(candidate: string | null | undefined): string | null {
  if (!candidate || typeof candidate !== 'string') return null;
  const normalized = candidate.trim();
  if (!normalized) return null;

  try {
    if (normalized.startsWith('/') && typeof window !== 'undefined') {
      return new URL(normalized, window.location.origin).toString();
    }
    const url = new URL(normalized.startsWith('http') ? normalized : `https://${normalized}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Returns a safe CSS url() expression when candidate is a safe http/https URL.
 */
export function safeCssUrl(candidate: string | null | undefined): string | null {
  const safe = toSafeHttpUrl(candidate);
  if (!safe) return null;
  return `url("${safe}")`;
}

/**
 * Opens safe external http/https links with hardened window features.
 */
export function safeExternalOpen(candidate: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  const safe = toSafeHttpUrl(candidate);
  if (!safe) return;
  const anchor = document.createElement('a');
  anchor.href = safe;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.click();
}
