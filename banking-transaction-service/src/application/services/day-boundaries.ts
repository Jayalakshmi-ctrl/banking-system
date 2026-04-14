export function utcDayRange(reference: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
}
