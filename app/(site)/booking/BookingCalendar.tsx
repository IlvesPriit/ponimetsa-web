"use client";

import { useEffect, useMemo, useState } from "react";

type DaysMap = Record<string, number>; // YYYY-MM-DD -> count
type TimeOption = { startISO: string; label: string };

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

// Monday-first calendar grid
function mondayIndex(jsDay: number) {
  // JS: 0=Sun..6=Sat -> 0=Mon..6=Sun
  return (jsDay + 6) % 7;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("et-EE", { month: "long", year: "numeric" });
}

export default function BookingCalendar({
  serviceSlug,
  inputName,
}: {
  serviceSlug: string;
  inputName: string;
}) {
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [days, setDays] = useState<DaysMap>({});
  const [loadingDays, setLoadingDays] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [times, setTimes] = useState<TimeOption[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);

  const [selectedStart, setSelectedStart] = useState<string>("");
  const [showAllTimes, setShowAllTimes] = useState(false);
  const MAX_TIMES = 8;

  // fetch days map for current month
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoadingDays(true);
      setSelectedStart("");
      setTimes([]);
      setSelectedDate("");
      setShowAllTimes(false);

      const from = ymd(startOfMonth(month));
      const to = ymd(endOfMonth(month));

      try {
        const res = await fetch(
          `/api/availability/days?service=${encodeURIComponent(
            serviceSlug
          )}&from=${from}&to=${to}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`days API ${res.status}: ${txt}`);
        }
        const json = (await res.json()) as any;
        // If API returns {_error: ...}, treat as empty days map
        if (json && typeof json === "object" && "_error" in json) {
          if (!cancelled) setDays({});
          return;
        }
        const map = (json ?? {}) as DaysMap;
        if (!cancelled) setDays(map);
      } catch {
        if (!cancelled) setDays({});
      } finally {
        if (!cancelled) setLoadingDays(false);
      }
    }

    if (serviceSlug) run();

    return () => {
      cancelled = true;
    };
  }, [month, serviceSlug]);

  async function loadTimes(date: string) {
    setSelectedDate(date);
    setSelectedStart("");
    setTimes([]);
    setShowAllTimes(false);
    setLoadingTimes(true);

    try {
      const res = await fetch(
        `/api/availability/times?service=${encodeURIComponent(
          serviceSlug
        )}&date=${date}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`times API ${res.status}: ${txt}`);
      }
      const json = (await res.json()) as any;
      // If API returns a diagnostic row with empty startISO, treat as empty
      if (Array.isArray(json) && json.length === 1 && json[0]?.startISO === "") {
        setTimes([]);
      } else {
        setTimes(Array.isArray(json) ? (json as TimeOption[]) : []);
      }
    } catch {
      setTimes([]);
    } finally {
      setLoadingTimes(false);
    }
  }

  const grid = useMemo(() => {
    const first = startOfMonth(month);
    const last = endOfMonth(month);

    const firstIdx = mondayIndex(first.getDay()); // 0..6
    const totalDays = last.getDate();

    const cells: Array<{ date: string; dayNum: number; inMonth: boolean }> = [];

    // leading blanks
    for (let i = 0; i < firstIdx; i++) {
      cells.push({ date: "", dayNum: 0, inMonth: false });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dt = new Date(month.getFullYear(), month.getMonth(), d);
      cells.push({ date: ymd(dt), dayNum: d, inMonth: true });
    }

    // trailing blanks to complete rows
    while (cells.length % 7 !== 0) {
      cells.push({ date: "", dayNum: 0, inMonth: false });
    }

    return cells;
  }, [month]);

  const weekDays = ["E", "T", "K", "N", "R", "L", "P"];

  const canPrev = useMemo(() => {
    // allow prev month only if not earlier than current month-1? (optional)
    return true;
  }, []);

  function prevMonth() {
    if (!canPrev) return;
    setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  }
  function nextMonth() {
    setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* Month calendar */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg border px-3 py-1 text-sm hover:bg-neutral-50"
          >
            ←
          </button>
          <div className="text-sm font-medium text-gray-900">
            {monthLabel(month)}
          </div>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg border px-3 py-1 text-sm hover:bg-neutral-50"
          >
            →
          </button>
        </div>

        <div
          className="mt-4 gap-2 text-center text-xs text-gray-600"
          style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
        >
          {weekDays.map((w) => (
            <div key={w} className="py-1 font-medium">
              {w}
            </div>
          ))}
        </div>

        <div
          className="mt-2 gap-2"
          style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
        >
          {grid.map((c, idx) => {
            if (!c.inMonth) {
              return <div key={idx} className="h-10" />;
            }

            const count = days[c.date] ?? 0;
            const has = count > 0;
            const isSelected = c.date === selectedDate;

            return (
              <button
                key={c.date}
                type="button"
                onClick={() => has && loadTimes(c.date)}
                disabled={!has || loadingDays}
                className={[
                  "relative flex h-10 items-center justify-center rounded-xl border text-sm",
                  has
                    ? "border-gray-300 hover:bg-neutral-50"
                    : "cursor-not-allowed opacity-35",
                  isSelected ? "border-black" : "border-gray-200",
                ].join(" ")}
                title={has ? "Saadaval" : "Pole vabu aegu"}
              >
                {/* Day number */}
                <span
                  className={[
                    "relative z-10 font-semibold",
                    has ? "text-gray-900" : "text-gray-400",
                  ].join(" ")}
                >
                  {c.dayNum}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 text-xs text-gray-600">
          {loadingDays ? "Laen vabu päevi…" : "Vali päev, millel on vabu aegu."}
        </div>
      </div>

      {/* Times list */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-medium text-gray-900">
          {selectedDate ? `Ajad: ${selectedDate}` : "Vali päev"}
        </div>
        <div className="mt-1 text-xs text-gray-600">
          Aja valik on 30 minuti kaupa (:00 / :30).
        </div>

        <div className="mt-4">
          {!selectedDate ? (
            <div className="text-sm text-gray-700">
              Vali vasakult kalendrist päev, et näha kellaaegu.
            </div>
          ) : loadingTimes ? (
            <div className="text-sm text-gray-700">Laen kellaaegu…</div>
          ) : times.length === 0 ? (
            <div className="text-sm text-gray-700">
              Sellel päeval ei ole enam sobivaid aegu.
            </div>
          ) : (
            <>
              <div className="max-h-[420px] overflow-y-auto pr-1 sm:max-h-[520px]">
                <div className="grid gap-2 sm:grid-cols-2">
                  {(showAllTimes ? times : times.slice(0, MAX_TIMES)).map((t) => (
                    <label
                      key={t.startISO}
                      className="flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 hover:bg-neutral-50"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {t.label}
                      </div>
                      <input
                        type="radio"
                        name="_calendar_time"
                        value={t.startISO}
                        checked={selectedStart === t.startISO}
                        onChange={() => setSelectedStart(t.startISO)}
                        className="h-4 w-4"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {times.length > MAX_TIMES && (
                <button
                  type="button"
                  onClick={() => setShowAllTimes((v) => !v)}
                  className="mt-3 w-full rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
                >
                  {showAllTimes
                    ? "Näita vähem"
                    : `Näita rohkem (${times.length - MAX_TIMES})`}
                </button>
              )}
            </>
          )}
        </div>

        {/* hidden input used by server action */}
        <input type="hidden" name={inputName} value={selectedStart} />

        {!selectedStart && (
          <div className="mt-4 text-xs text-gray-600">
            Enne broneeringu saatmist vali kellaaeg.
          </div>
        )}
      </div>
    </div>
  );
}