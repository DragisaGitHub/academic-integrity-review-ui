export function formatDateOrDash(
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locale: string = 'en-US',
): string {
  if (!value) return '—';
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return '—';
  return new Date(timestamp).toLocaleDateString(locale, options);
}
