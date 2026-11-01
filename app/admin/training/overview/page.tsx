import Link from "next/link";
import { pool } from "@/lib/db";
import { formatEstonianDate, formatEstonianTime } from "@/lib/estonian-date";
import { AdminFeedback } from "@/components/training/AdminFeedback";
import { AdminPageHeader } from "@/components/training/AdminPageHeader";

type SessionRow = {
  id: string; title: string; starts_at: string | Date; capacity: number; status: string;
  rider_count: number; waitlist_count: number; assigned_count: number;
};

export default async function TrainingOverviewPage({ searchParams }: { searchParams?: Promise<{ saved?: string }> }) {
  const params = (await searchParams) ?? {};
  const [todayRes, alertRes, waitlistRes, creditRes, riderRes, policyRes] = await Promise.all([
    pool.query<SessionRow>(
      `select s.id, s.title, s.starts_at, s.capacity, s.status,
              count(distinct b.id)::int as rider_count, count(distinct w.id)::int as waitlist_count,
              count(distinct ha.id)::int as assigned_count
       from public.training_sessions s
       left join public.training_bookings b on b.session_id = s.id and b.status in ('pending_trainer', 'confirmed', 'attended')
       left join public.training_waitlist_entries w on w.session_id = s.id and w.status in ('waiting', 'offered')
       left join public.training_horse_assignments ha on ha.session_id = s.id
       where (s.starts_at at time zone 'Europe/Tallinn')::date = (now() at time zone 'Europe/Tallinn')::date
       group by s.id order by s.starts_at`
    ),
    pool.query<SessionRow>(
      `select s.id, s.title, s.starts_at, s.capacity, s.status,
              count(distinct b.id)::int as rider_count, count(distinct w.id)::int as waitlist_count,
              count(distinct ha.id)::int as assigned_count
       from public.training_sessions s
       left join public.training_bookings b on b.session_id = s.id and b.status in ('pending_trainer', 'confirmed')
       left join public.training_waitlist_entries w on w.session_id = s.id and w.status in ('waiting', 'offered')
       left join public.training_horse_assignments ha on ha.session_id = s.id
       where s.starts_at >= now() and s.starts_at < now() + interval '8 days' and s.status = 'open'
       group by s.id
       having count(distinct w.id) > 0 or count(distinct ha.id) < count(distinct b.id)
       order by s.starts_at limit 8`
    ),
    pool.query<{ count: number }>(`select count(*)::int as count from public.training_waitlist_entries where status in ('waiting', 'offered')`),
    pool.query<{ count: number }>(`select count(*)::int as count from public.training_credits where state = 'available' and expires_at > now()`),
    pool.query<{ count: number }>(`select count(*)::int as count from public.riders where active = true`),
    pool.query<{ customer_notifications_enabled: boolean }>(`select customer_notifications_enabled from public.training_policies where id = 'main'`),
  ]);
  const todayRiders = todayRes.rows.reduce((sum, session) => sum + session.rider_count, 0);
  const todayFree = todayRes.rows.reduce((sum, session) => sum + Math.max(0, session.capacity - session.rider_count), 0);
  const notificationsEnabled = policyRes.rows[0]?.customer_notifications_enabled ?? false;

  return <>
    <AdminPageHeader eyebrow="Treeningute töölaud" title="Tere tulemast"
      description={`Täna, ${formatEstonianDate(new Date())}. Siit näed kiiresti, mis vajab tähelepanu ja kuidas tänased trennid täituvad.`}
      actions={<>
        <Link href="/admin/training/preview" className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 shadow-sm transition hover:border-green-700">Testi kasutajavaadet</Link>
        <Link href="/admin/training/calendar" className="rounded-xl bg-green-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800">Ava kalender</Link>
      </>} />
    <AdminFeedback message={params.saved} />

    {!notificationsEnabled && <div className="mb-6 flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"><span><strong>Turvaline testrežiim:</strong> klientidele ei saadeta automaatseid teavitusi.</span><Link href="/admin/training/settings" className="font-semibold underline underline-offset-4">Vaata seadeid</Link></div>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: "Täna trennis", value: todayRiders, note: `${todayRes.rowCount ?? 0} treeningut`, color: "bg-green-900 text-white" },
        { label: "Täna vabu kohti", value: todayFree, note: "kõigi trennide peale", color: "bg-white text-stone-900" },
        { label: "Ootenimekirjas", value: waitlistRes.rows[0]?.count ?? 0, note: "ootab kohta", color: "bg-white text-stone-900" },
        { label: "Aktiivseid krediite", value: creditRes.rows[0]?.count ?? 0, note: `${riderRes.rows[0]?.count ?? 0} aktiivset ratsanikku`, color: "bg-[#dce7db] text-green-950" },
      ].map((card) => <article key={card.label} className={`rounded-3xl border border-stone-200 p-5 shadow-sm ${card.color}`}><p className="text-sm font-medium opacity-75">{card.label}</p><p className="mt-3 text-4xl font-semibold tracking-tight">{card.value}</p><p className="mt-2 text-xs opacity-70">{card.note}</p></article>)}
    </section>

    <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.8fr)]">
      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Tänased trennid</h2><p className="mt-1 text-sm text-stone-500">Kohtade ja hobuste valmisolek ühe pilguga.</p></div><Link href="/admin/training/calendar" className="text-sm font-semibold text-green-800">Kogu nädal →</Link></div>
        <div className="space-y-3">
          {todayRes.rows.map((session) => {
            const full = session.rider_count >= session.capacity;
            const horsesReady = session.rider_count > 0 && session.assigned_count >= session.rider_count;
            return <Link key={session.id} href={`/admin/training/calendar?session=${session.id}`} className="group grid gap-4 rounded-2xl border border-stone-200 p-4 transition hover:border-green-700 hover:shadow-sm sm:grid-cols-[76px_minmax(0,1fr)_auto] sm:items-center">
              <div><p className="text-xl font-semibold text-green-950">{formatEstonianTime(session.starts_at)}</p><p className="text-xs text-stone-500">{session.status === "cancelled" ? "Tühistatud" : "Täna"}</p></div>
              <div><p className="font-semibold group-hover:text-green-900">{session.title || "Grupitrenn"}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className={`h-full rounded-full ${full ? "bg-amber-500" : "bg-green-700"}`} style={{ width: `${Math.min(100, (session.rider_count / session.capacity) * 100)}%` }} /></div></div>
              <div className="flex flex-wrap gap-2 text-xs sm:justify-end"><span className={`rounded-full px-2.5 py-1 font-semibold ${full ? "bg-amber-100 text-amber-900" : "bg-green-50 text-green-900"}`}>{session.rider_count}/{session.capacity} kohta</span><span className={`rounded-full px-2.5 py-1 font-semibold ${horsesReady ? "bg-green-50 text-green-900" : "bg-stone-100 text-stone-600"}`}>{horsesReady ? "Hobused valmis" : `${session.assigned_count}/${session.rider_count} hobust`}</span>{session.waitlist_count > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-900">+{session.waitlist_count} ootel</span>}</div>
            </Link>;
          })}
          {!todayRes.rows.length && <div className="rounded-2xl border border-dashed border-stone-300 px-5 py-10 text-center"><p className="font-medium text-stone-700">Tänaseks ei ole trenne loodud.</p><Link href="/admin/training/calendar" className="mt-2 inline-block text-sm font-semibold text-green-800">Loo nädalaplaan kalendrisse →</Link></div>}
        </div>
      </section>

      <aside className="rounded-3xl border border-stone-200 bg-[#ebe8df] p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold">Vajab tähelepanu</h2><span className="grid h-7 min-w-7 place-items-center rounded-full bg-amber-400 px-2 text-xs font-bold text-amber-950">{alertRes.rowCount ?? 0}</span></div>
        <div className="space-y-3">
          {alertRes.rows.map((session) => <Link key={session.id} href={`/admin/training/calendar?session=${session.id}`} className="block rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-green-700"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{session.title || "Grupitrenn"}</p><p className="mt-1 text-xs text-stone-500">{formatEstonianDate(session.starts_at)} kell {formatEstonianTime(session.starts_at)}</p></div><span className="text-green-800">→</span></div><div className="mt-3 flex flex-wrap gap-2 text-xs">{session.assigned_count < session.rider_count && <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-900">{session.rider_count - session.assigned_count} hobust määramata</span>}{session.waitlist_count > 0 && <span className="rounded-full bg-stone-100 px-2.5 py-1 font-semibold text-stone-700">{session.waitlist_count} ootenimekirjas</span>}</div></Link>)}
          {!alertRes.rows.length && <p className="rounded-2xl bg-white/60 px-4 py-8 text-center text-sm text-stone-600">Kõik järgmise nädala trennid on korras.</p>}
        </div>
      </aside>
    </div>
  </>;
}
