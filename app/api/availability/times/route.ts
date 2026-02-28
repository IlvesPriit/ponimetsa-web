import { NextResponse } from "next/server";
import { pool } from "@/lib/db";


const DURATIONS: Record<string, number> = {
  ponijalutus: 30,
  eratrenn: 60,
};

const TZ = "Europe/Tallinn";

function localParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const yyyy = get("year");
  const mm = get("month");
  const dd = get("day");
  const hh = Number(get("hour"));
  const min = Number(get("minute"));

  return { yyyy, mm, dd, hh, min };
}

function localYMD(d: Date) {
  const { yyyy, mm, dd } = localParts(d);
  return `${yyyy}-${mm}-${dd}`;
}

function isAllowedStartTime(d: Date) {
  const { hh, min } = localParts(d);
  // Allow 08:00 .. 21:00 inclusive
  if (hh < 8) return false;
  if (hh > 21) return false;
  if (hh === 21 && min > 0) return false;
  return true;
}

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}

function ceilToHalfHour(d: Date) {
  const step = 30 * 60_000;
  return new Date(Math.ceil(d.getTime() / step) * step);
}

function fmtEt(d: Date) {
  return d.toLocaleTimeString("et-EE", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const service = String(searchParams.get("service") ?? "").trim().toLowerCase();
  const date = String(searchParams.get("date") ?? ""); // YYYY-MM-DD

  const duration = DURATIONS[service];
  if (!duration) return NextResponse.json([{ startISO: "", label: `unknown service: ${service}` }]);
  if (!date) return NextResponse.json([], { status: 400 });

  const winRes = await pool.query(
    `select start_at, end_at
     from public.availability_slots
     where is_active = true
       and end_at >= (now() + interval '30 minutes')
       and start_at < ($1::date + interval '1 day')
       and end_at > ($1::date)
     order by start_at asc
     limit 500;`,
    [date]
  );

  let busy: Array<{ start: number; end: number }> = [];
  try {
    const r1 = await pool.query(
      `select 1 from information_schema.columns
       where table_schema='public' and table_name='bookings' and column_name='start_at' limit 1;`
    );
    const r2 = await pool.query(
      `select 1 from information_schema.columns
       where table_schema='public' and table_name='bookings' and column_name='end_at' limit 1;`
    );
    const hasStartEnd = (r1.rowCount ?? 0) === 1 && (r2.rowCount ?? 0) === 1;

    if (hasStartEnd) {
      const bRes = await pool.query(
        `select start_at, end_at
         from public.bookings
         where status in ('pending','confirmed')
           and start_at < ($1::date + interval '1 day')
           and end_at > ($1::date)`,
        [date]
      );
      busy = bRes.rows.map((r: any) => ({
        start: new Date(r.start_at).getTime(),
        end: new Date(r.end_at).getTime(),
      }));
    }
  } catch {
    busy = [];
  }

  const now = new Date();
  const minStart = addMinutes(now, 30);

  const out: Array<{ startISO: string; label: string }> = [];

  for (const w of winRes.rows as Array<{ start_at: string; end_at: string }>) {
    const wStart = new Date(w.start_at);
    const wEnd = new Date(w.end_at);

    const earliest = ceilToHalfHour(
      new Date(Math.max(wStart.getTime(), minStart.getTime()))
    );

    for (
      let t = new Date(earliest);
      t.getTime() + duration * 60_000 <= wEnd.getTime();
      t = addMinutes(t, 30)
    ) {
      const end = addMinutes(t, duration);

      if (busy.some((b) => t.getTime() < b.end && end.getTime() > b.start)) {
        continue;
      }

      // Keep only the requested Estonia local date, and only between 08:00..21:00 local
      if (localYMD(t) !== date) continue;
      if (!isAllowedStartTime(t)) continue;

      out.push({
        startISO: t.toISOString(),
        label: `${fmtEt(t)} – ${fmtEt(end)}`,
      });
    }
  }

  // uniq + sort
  const uniq = new Map<string, string>();
  for (const o of out) uniq.set(o.startISO, o.label);

  const result = Array.from(uniq.entries())
    .map(([startISO, label]) => ({ startISO, label }))
    .sort((a, b) => a.startISO.localeCompare(b.startISO));

  return NextResponse.json(result, {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}