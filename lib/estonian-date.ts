const TALLINN_TIME_ZONE = "Europe/Tallinn";

function parts(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const formatted = new Intl.DateTimeFormat("et-EE", {
    timeZone: TALLINN_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    formatted.find((part) => part.type === type)?.value ?? "";

  return {
    day: get("day"),
    month: get("month"),
    year: get("year"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

export function formatEstonianDate(value: string | Date) {
  const { day, month, year } = parts(value);
  return `${day}/${month}/${year}`;
}

export function formatEstonianTime(value: string | Date) {
  const { hour, minute } = parts(value);
  return `${hour}:${minute}`;
}

export function formatEstonianDateTime(value: string | Date, includeWeekday = false) {
  const date = value instanceof Date ? value : new Date(value);
  const weekday = includeWeekday
    ? `${new Intl.DateTimeFormat("et-EE", {
        timeZone: TALLINN_TIME_ZONE,
        weekday: "short",
      }).format(date).replace(/\.$/, "")}, `
    : "";
  return `${weekday}${formatEstonianDate(date)} ${formatEstonianTime(date)}`;
}

export function formatEstonianRange(start: string | Date, end?: string | Date | null) {
  const startText = `${formatEstonianDate(start)} ${formatEstonianTime(start)}`;
  return end ? `${startText}–${formatEstonianTime(end)}` : startText;
}

export function parseEstonianDate(value: FormDataEntryValue | null, label = "Kuupäev") {
  const text = String(value ?? "").trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) throw new Error(`${label} peab olema kujul pp/kk/aaaa`);

  const [, day, month, year] = match;
  const test = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    test.getUTCFullYear() !== Number(year) ||
    test.getUTCMonth() + 1 !== Number(month) ||
    test.getUTCDate() !== Number(day)
  ) {
    throw new Error(`${label} ei ole kehtiv kuupäev`);
  }

  return `${year}-${month}-${day}`;
}
