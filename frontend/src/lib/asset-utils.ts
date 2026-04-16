/**
 * Helpers for resolving API-provided media paths into browser-ready URLs.
 */

/**
 * Converts relative asset path to absolute CDN URL when configured.
 */
export function resolveAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cdn = process.env.NEXT_PUBLIC_CDN_URL;
  if (!cdn) return path;
  return `${cdn.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

