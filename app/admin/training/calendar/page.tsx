import Link from "next/link";
import { pool } from "@/lib/db";
import { formatEstonianDate, formatEstonianTime } from "@/lib/estonian-date";
import { addDays, isoDate, mondayOfWeek, toEstonianDateInput, weekdayName } from "@/lib/training-admin";
import { AdminFeedback } from "@/components/training/AdminFeedback";
import { AdminPageHeader } from "@/components/training/AdminPageHeader";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { assignHorse, createSession, generateSessions, publishHorseAssignments, updateSession } from "../actions";

type SessionRow = {
  id: string; title: string; starts_at: string | Date; ends_at: string | Date; capacity: number;
  status: "open" | "cancelled" | "completed"; horse_assignment_state: "draft" | "published";
  cancellation_credit_mode: "all" | "none" | null; rider_count: number; waitlist_count: number; assigned_count: number;
};
type BookingRow = { id: string; rider_id: string; rider_name: string; status: string; booking_kind: string; horse_id: string | null; horse_name: string | null; assignment_state: string | null };
type HorseRow = { id: string; name: string };
type SlotRow = { id: string; group_name: string; weekday: number; start_time: string };

function dateKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Tallinn", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export default async function TrainingCalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ week?: string; session?: string; saved?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const monday = mondayOfWeek(params.week);
  const weekStart = isoDate(monday);
  const weekEnd = isoDate(addDays(monday, 7));
  const [sessionsRes, horsesRes, slotsRes] = await Promise.all([
    pool.query<SessionRow>(
      `select s.id, s.title, s.starts_at, s.ends_at, s.capacity, s.status,
              s.horse_assignment_state, s.cancellation_credit_mode,
              count(distinct b.id)::int as rider_count, count(distinct w.id)::int as waitlist_count,
              count(distinct ha.id)::int as assigned_count
       from public.training_sessions s
       left join public.training_bookings b on b.session_id = s.id and b.status in ('pending_trainer', 'confirmed', 'attended')
       left join public.training_waitlist_entries w on w.session_id = s.id and w.status in ('waiting', 'offered')
       left join public.training_horse_assignments ha on ha.session_id = s.id
       where s.starts_at >= ($1::date at time zone 'Europe/Tallinn')
         and s.starts_at < ($2::date at time zone 'Europe/Tallinn')
       group by s.id order by s.starts_at`,
      [weekStart, weekEnd]
    ),
    pool.query<HorseRow>(`select id, name from public.horses where active = true order by name`),
    pool.query<SlotRow>(
      `select s.id, g.name as group_name, s.weekday, to_char(s.start_time, 'HH24:MI') as start_time
       from public.training_group_slots s join public.training_groups g on g.id = s.group_id
       where s.active = true and g.active = true order by s.weekday, s.start_time`
    ),
  ]);
  const selectedId = params.session ?? sessionsRes.rows[0]?.id ?? "";
  let selected = sessionsRes.rows.find((session) => session.id === selectedId) ?? null;
  if (!selected && selectedId) {
    const result = await pool.query<SessionRow>(
      `select s.id, s.title, s.starts_at, s.ends_at, s.capacity, s.status,
              s.horse_assignment_state, s.cancellation_credit_mode,
              count(distinct b.id)::int as rider_count, count(distinct w.id)::int as waitlist_count,
              count(distinct ha.id)::int as assigned_count
       from public.training_sessions s
       left join public.training_bookings b on b.session_id = s.id and b.status in ('pending_trainer', 'confirmed', 'attended')
       left join public.training_waitlist_entries w on w.session_id = s.id and w.status in ('waiting', 'offered')
       left join public.training_horse_assignments ha on ha.session_id = s.id
       where s.id = $1 group by s.id`,
      [selectedId]
    );
    selected = result.rows[0] ?? null;
  }
  const bookingsRes = selected ? await pool.query<BookingRow>(
    `select b.id, b.rider_id, r.display_name as rider_name, b.status, b.booking_kind,
            ha.horse_id, h.name as horse_name, ha.state as assignment_state
     from public.training_bookings b
     join public.riders r on r.id = b.rider_id
     left join public.training_horse_assignments ha on ha.session_id = b.session_id and ha.rider_id = b.rider_id
     left join public.horses h on h.id = ha.horse_id
     where b.session_id = $1 and b.status in ('pending_trainer', 'confirmed', 'attended')
     order by r.display_name`, [selected.id]
  ) : { rows: [] as BookingRow[] };
  const returnTo = `/admin/training/calendar?week=${weekStart}${selected ? `&session=${selected.id}` : ""}`;
  const dayDates = Array.from({ length: 7 }, (_, index) => addDays(monday, index));

  return <>
    <AdminPageHeader eyebrow="Treeneri põhitöölaud" title="Treeningute kalender" description="Nädalaplaan, täituvus ja hobuste määramine ühes vaates. Klõpsa trennil, et avada selle detailid."
      actions={<details className="relative"><summary className="cursor-pointer list-none rounded-xl bg-green-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm">+ Lisa kalendrisse</summary><div className="absolute right-0 z-20 mt-2 w-[min(92vw,420px)] rounded-2xl border border-stone-200 bg-white p-5 shadow-xl">
        <h3 className="font-semibold">Loo trennid automaatselt</h3><p className="mt-1 text-xs text-stone-500">Kõik aktiivsed püsigrupid lisatakse valitud nädalateks; olemasolevaid ei dubleerita.</p>
        <form action={generateSessions} className="mt-4 grid grid-cols-[1fr_90px] gap-3"><input type="hidden" name="return_to" value={returnTo} /><label className="text-xs font-semibold text-stone-600">Alguskuupäev<input name="start_date" defaultValue={toEstonianDateInput(weekStart)} placeholder="pp/kk/aaaa" className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" /></label><label className="text-xs font-semibold text-stone-600">Nädalaid<input name="weeks" type="number" min="1" max="26" defaultValue="6" className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" /></label><SubmitButton pendingLabel="Loon…" className="col-span-2 rounded-xl bg-green-900 px-4 py-2.5 text-sm font-semibold text-white">Loo nädalaplaan</SubmitButton></form>
        <div className="my-5 border-t" /><h3 className="font-semibold">Loo üks trenn</h3><form action={createSession} className="mt-3 space-y-3"><input type="hidden" name="return_to" value={returnTo} /><select name="slot_id" required className="w-full rounded-xl border px-3 py-2.5 text-sm"><option value="">Vali püsigrupp…</option>{slotsRes.rows.map((slot) => <option key={slot.id} value={slot.id}>{weekdayName(slot.weekday)} {slot.start_time} · {slot.group_name}</option>)}</select><input name="session_date" defaultValue={toEstonianDateInput(weekStart)} placeholder="pp/kk/aaaa" required className="w-full rounded-xl border px-3 py-2.5 text-sm" /><SubmitButton pendingLabel="Loon…" className="w-full rounded-xl border border-green-800 px-4 py-2.5 text-sm font-semibold text-green-900">Loo üks trenn</SubmitButton></form>
      </div></details>} />
    <AdminFeedback message={params.saved} />

    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2"><Link href={`/admin/training/calendar?week=${isoDate(addDays(monday, -7))}`} className="rounded-lg border px-3 py-2 text-sm" aria-label="Eelmine nädal">←</Link><Link href="/admin/training/calendar" className="rounded-lg border px-3 py-2 text-sm font-semibold">Täna</Link><Link href={`/admin/training/calendar?week=${isoDate(addDays(monday, 7))}`} className="rounded-lg border px-3 py-2 text-sm" aria-label="Järgmine nädal">→</Link></div>
      <p className="font-semibold text-green-950">{formatEstonianDate(monday)} – {formatEstonianDate(addDays(monday, 6))}</p>
      <div className="flex gap-3 text-xs text-stone-500"><span>● vabu kohti</span><span className="text-amber-700">● täis / ootel</span></div>
    </div>

    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_410px]">
      <section className="overflow-x-auto rounded-3xl border border-stone-200 bg-white p-3 shadow-sm">
        <div className="grid min-w-[980px] grid-cols-7 gap-2">
          {dayDates.map((day, index) => {
            const key = isoDate(day);
            const daySessions = sessionsRes.rows.filter((session) => dateKey(session.starts_at) === key);
            const today = key === dateKey(new Date());
            return <div key={key} className={`min-h-[570px] rounded-2xl p-2.5 ${today ? "bg-green-50" : "bg-stone-50"}`}>
              <div className="mb-3 border-b border-stone-200 pb-2 text-center"><p className={`text-xs font-bold uppercase tracking-wide ${today ? "text-green-800" : "text-stone-500"}`}>{weekdayName(index + 1)}</p><p className="mt-1 text-sm font-semibold">{formatEstonianDate(day).slice(0, 5)}</p></div>
              <div className="space-y-2">{daySessions.map((session) => {
                const full = session.rider_count >= session.capacity;
                const active = selected?.id === session.id;
                return <Link key={session.id} href={`/admin/training/calendar?week=${weekStart}&session=${session.id}`} className={`block rounded-xl border p-3 transition ${active ? "border-green-800 bg-green-900 text-white shadow-md" : session.status === "cancelled" ? "border-red-200 bg-red-50 opacity-70" : full || session.waitlist_count ? "border-amber-200 bg-amber-50 hover:border-amber-500" : "border-stone-200 bg-white hover:border-green-700"}`}>
                  <div className="flex items-start justify-between gap-2"><span className="text-sm font-bold">{formatEstonianTime(session.starts_at)}</span><span className={`text-[10px] font-bold ${active ? "text-white/70" : "text-stone-500"}`}>{session.rider_count}/{session.capacity}</span></div><p className="mt-2 text-xs font-semibold leading-4">{session.title || "Grupitrenn"}</p><div className={`mt-2 h-1 overflow-hidden rounded-full ${active ? "bg-white/25" : "bg-stone-200"}`}><div className={`h-full ${active ? "bg-white" : full ? "bg-amber-500" : "bg-green-700"}`} style={{ width: `${Math.min(100, session.capacity ? session.rider_count / session.capacity * 100 : 0)}%` }} /></div>{session.waitlist_count > 0 && <p className={`mt-2 text-[10px] font-semibold ${active ? "text-amber-200" : "text-amber-800"}`}>+{session.waitlist_count} ootenimekirjas</p>}
                </Link>;
              })}{!daySessions.length && <p className="px-2 py-8 text-center text-xs text-stone-400">Trenne ei ole</p>}</div>
            </div>;
          })}
        </div>
      </section>

      <aside className="self-start rounded-3xl border border-stone-200 bg-white p-5 shadow-sm 2xl:sticky 2xl:top-6">
        {selected ? <>
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-green-800">Trenni detail</p><h2 className="mt-1 text-2xl font-semibold">{selected.title || "Grupitrenn"}</h2><p className="mt-1 text-sm text-stone-500">{formatEstonianDate(selected.starts_at)} · {formatEstonianTime(selected.starts_at)}–{formatEstonianTime(selected.ends_at)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${selected.status === "open" ? "bg-green-50 text-green-900" : selected.status === "cancelled" ? "bg-red-50 text-red-800" : "bg-stone-100 text-stone-700"}`}>{selected.status === "open" ? "Avatud" : selected.status === "cancelled" ? "Tühistatud" : "Toimunud"}</span></div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-stone-50 p-3"><strong className="block text-xl">{selected.rider_count}/{selected.capacity}</strong><span className="text-[11px] text-stone-500">ratsanikku</span></div><div className="rounded-xl bg-stone-50 p-3"><strong className="block text-xl">{selected.assigned_count}</strong><span className="text-[11px] text-stone-500">hobust</span></div><div className="rounded-xl bg-stone-50 p-3"><strong className="block text-xl">{selected.waitlist_count}</strong><span className="text-[11px] text-stone-500">ootel</span></div></div>

          <div className="mt-6"><div className="flex items-center justify-between"><h3 className="font-semibold">Ratsanikud ja hobused</h3><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${selected.horse_assignment_state === "published" ? "bg-green-100 text-green-900" : "bg-amber-100 text-amber-900"}`}>{selected.horse_assignment_state === "published" ? "Avaldatud" : "Mustand"}</span></div>
            <div className="mt-3 space-y-2">{bookingsRes.rows.map((booking) => <form key={booking.id} action={assignHorse} className="grid grid-cols-[minmax(0,1fr)_minmax(125px,0.9fr)_auto] items-center gap-2 rounded-xl border border-stone-200 p-2.5"><input type="hidden" name="session_id" value={selected.id} /><input type="hidden" name="rider_id" value={booking.rider_id} /><input type="hidden" name="return_to" value={returnTo} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{booking.rider_name}</p><p className="text-[10px] text-stone-500">{booking.booking_kind === "makeup" ? "Järeletegemine" : booking.status === "pending_trainer" ? "Ootab kinnitust" : "Püsiaeg"}</p></div><select name="horse_id" defaultValue={booking.horse_id ?? ""} className="min-w-0 rounded-lg border px-2 py-2 text-xs"><option value="">Määramata</option>{horsesRes.rows.map((horse) => <option key={horse.id} value={horse.id}>{horse.name}</option>)}</select><SubmitButton pendingLabel="…" className="rounded-lg bg-stone-100 px-2.5 py-2 text-xs font-bold text-stone-700" aria-label={`Salvesta ${booking.rider_name} hobune`}>✓</SubmitButton></form>)}{!bookingsRes.rows.length && <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">Selles trennis ei ole veel ratsanikke.</p>}</div>
            {bookingsRes.rows.length > 0 && <form action={publishHorseAssignments} className="mt-3"><input type="hidden" name="session_id" value={selected.id} /><input type="hidden" name="return_to" value={returnTo} /><SubmitButton pendingLabel="Avaldan…" className="w-full rounded-xl bg-green-900 px-4 py-2.5 text-sm font-semibold text-white">Avalda hobused osalejatele</SubmitButton></form>}
          </div>

          <details className="mt-6 border-t pt-4"><summary className="cursor-pointer text-sm font-semibold text-green-800">Muuda aega, mahtu või olekut</summary><form action={updateSession} className="mt-4 grid grid-cols-2 gap-3"><input type="hidden" name="id" value={selected.id} /><input type="hidden" name="return_to" value={returnTo} /><label className="col-span-2 text-xs font-semibold text-stone-600">Kuupäev<input name="session_date" defaultValue={formatEstonianDate(selected.starts_at)} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" /></label><label className="text-xs font-semibold text-stone-600">Algus<input name="start_time" type="time" defaultValue={formatEstonianTime(selected.starts_at)} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" /></label><label className="text-xs font-semibold text-stone-600">Kohti<input name="capacity" type="number" min="1" defaultValue={selected.capacity} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" /></label><label className="text-xs font-semibold text-stone-600">Olek<select name="status" defaultValue={selected.status} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"><option value="open">Avatud</option><option value="completed">Toimunud</option><option value="cancelled">Tühistatud</option></select></label><label className="text-xs font-semibold text-stone-600">Tühistamisel krediit<select name="cancellation_credit_mode" defaultValue={selected.cancellation_credit_mode ?? "none"} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"><option value="none">Keegi ei saa</option><option value="all">Kõik saavad</option></select></label><SubmitButton pendingLabel="Salvestan…" className="col-span-2 rounded-xl border border-green-800 px-4 py-2.5 text-sm font-semibold text-green-900">Salvesta trenni muudatused</SubmitButton></form></details>
        </> : <div className="py-16 text-center"><p className="text-3xl">▦</p><h2 className="mt-3 font-semibold">Vali kalendrist trenn</h2><p className="mt-1 text-sm text-stone-500">Siia ilmuvad osalejad, hobused ja trenni seaded.</p></div>}
      </aside>
    </div>
  </>;
}
