/** Display formatting only. Every figure itself comes from the server. */

const EM_DASH = '—';

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EM_DASH;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Spelled out rather than taken from Intl: `en-GB` renders September as "Sept" in current
 * ICU, and the spec's format is `DD MMM YYYY` — "02 Sep 2026".
 */
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
] as const;

/** UTC in, `DD MMM YYYY` out — "02 Sep 2026". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return EM_DASH;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EM_DASH;
  const month = MONTHS[date.getUTCMonth()];
  if (!month) return EM_DASH;
  return `${String(date.getUTCDate()).padStart(2, '0')} ${month} ${date.getUTCFullYear()}`;
}

export function formatDateUpper(iso: string | null | undefined): string {
  return formatDate(iso).toUpperCase();
}

/** "R. Fernando" → "RF". */
export function initials(name: string): string {
  return name
    .replace(/[^A-Za-z. ]/g, '')
    .split(/[ .]+/)
    .filter(Boolean)
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** "Admin or Garment technician" — used for the permission hints. */
export function joinWithOr(items: string[]): string {
  return items.join(' or ');
}

export function zeroPad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

/** The arithmetic line under a thread row, exactly as the spec writes it. */
export function coneWorking(
  metresWithWastage: number,
  coneYieldM: number,
  rawCones: number,
  cones: number
): string {
  return `${formatNumber(metresWithWastage)} m ÷ ${formatNumber(coneYieldM)} m = ${formatNumber(
    rawCones,
    2
  )} → ${formatNumber(cones)} cones`;
}

export { EM_DASH };
