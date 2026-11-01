export const WEEKDAYS = [
  [1, "Esmaspäev"],
  [2, "Teisipäev"],
  [3, "Kolmapäev"],
  [4, "Neljapäev"],
  [5, "Reede"],
  [6, "Laupäev"],
  [7, "Pühapäev"],
] as const;

export function weekdayName(day: number) {
  return WEEKDAYS.find(([value]) => value === day)?.[1] ?? "Määramata";
}

export function toEstonianDateInput(isoDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : isoDate;
}

export function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function mondayOfWeek(input?: string) {
  const parsed = input && /^\d{4}-\d{2}-\d{2}$/.test(input) ? new Date(`${input}T12:00:00Z`) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12));
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - weekday + 1);
  return utc;
}

export function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
