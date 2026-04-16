/**
 * YouTube helper utilities for parsing and embedding videos.
 */

/**
 * Extracts a YouTube video ID from common YouTube URLs.
 */
export function parseYouTubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsedUrl = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = parsedUrl.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      return parsedUrl.pathname.replace('/', '') || null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsedUrl.pathname === '/watch') return parsedUrl.searchParams.get('v');
      if (parsedUrl.pathname.startsWith('/embed/')) return parsedUrl.pathname.split('/')[2] || null;
      if (parsedUrl.pathname.startsWith('/shorts/')) return parsedUrl.pathname.split('/')[2] || null;
    }
  } catch {
    return null;
  }

  return null;
}

