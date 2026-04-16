/**
 * Color utility helpers for invitation theming and WCAG-aware text contrast.
 */

/**
 * Normalizes incoming hex-like values and falls back when input is invalid.
 */
export function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const raw = value.trim();
  if (!raw) return fallback;

  const candidate = raw.startsWith('#') ? raw : `#${raw}`;
  if (/^#[0-9a-fA-F]{6}$/.test(candidate)) return candidate.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(candidate)) {
    const expanded = candidate
      .slice(1)
      .split('')
      .map((char) => `${char}${char}`)
      .join('');
    return `#${expanded}`.toUpperCase();
  }

  return fallback;
}

/**
 * Converts a hex color to rgba() string with provided alpha.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const normalized = normalizeHexColor(hex, '#000000');
  const parsed = normalized.slice(1);
  const r = Number.parseInt(parsed.slice(0, 2), 16);
  const g = Number.parseInt(parsed.slice(2, 4), 16);
  const b = Number.parseInt(parsed.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Blends a base color with a target color by ratio.
 */
export function mixHexColors(base: string, target: string, ratio: number): string {
  const normalizedBase = normalizeHexColor(base, '#000000').slice(1);
  const normalizedTarget = normalizeHexColor(target, '#FFFFFF').slice(1);
  const clampedRatio = Math.max(0, Math.min(1, ratio));

  const baseRgb = [
    Number.parseInt(normalizedBase.slice(0, 2), 16),
    Number.parseInt(normalizedBase.slice(2, 4), 16),
    Number.parseInt(normalizedBase.slice(4, 6), 16),
  ];
  const targetRgb = [
    Number.parseInt(normalizedTarget.slice(0, 2), 16),
    Number.parseInt(normalizedTarget.slice(2, 4), 16),
    Number.parseInt(normalizedTarget.slice(4, 6), 16),
  ];

  const mixed = baseRgb.map((channel, index) =>
    Math.round(channel + (targetRgb[index] - channel) * clampedRatio),
  );

  const toHex = (value: number) => value.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(mixed[0])}${toHex(mixed[1])}${toHex(mixed[2])}`;
}

function srgbChannelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const normalized = normalizeHexColor(hex, '#000000').slice(1);
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  const lR = srgbChannelToLinear(r);
  const lG = srgbChannelToLinear(g);
  const lB = srgbChannelToLinear(b);
  return 0.2126 * lR + 0.7152 * lG + 0.0722 * lB;
}

/**
 * Calculates WCAG contrast ratio between two colors.
 */
export function contrastRatio(colorA: string, colorB: string): number {
  const luminanceA = relativeLuminance(colorA);
  const luminanceB = relativeLuminance(colorB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Picks readable text color by preferring WCAG AA compliant value.
 */
export function pickReadableTextColor(backgroundHex: string): '#111111' | '#FFFFFF' {
  const dark = '#111111' as const;
  const light = '#FFFFFF' as const;

  const darkRatio = contrastRatio(backgroundHex, dark);
  const lightRatio = contrastRatio(backgroundHex, light);

  if (darkRatio >= 4.5) return dark;
  if (lightRatio >= 4.5) return light;
  return darkRatio >= lightRatio ? dark : light;
}
