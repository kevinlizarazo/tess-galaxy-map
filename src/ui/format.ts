const LY_PER_PC = 3.26156;

export function fmt(value: number | null, digits = 2, unit = ''): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const s = Math.abs(value) >= 1000 ? Math.round(value).toLocaleString('en-US') : value.toFixed(digits);
  return unit ? `${s} ${unit}` : s;
}

export function fmtDistance(pc: number | null): string {
  if (pc === null) return '—';
  return `${fmt(pc, 1, 'pc')} (${fmt(pc * LY_PER_PC, 0, 'ly')})`;
}

export function fmtPeriod(days: number | null): string {
  if (days === null) return '—';
  if (days < 1) return `${fmt(days * 24, 1)} h`;
  return fmt(days, 2, 'd');
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
