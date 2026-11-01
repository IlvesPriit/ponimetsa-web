import Link from "next/link";
import { pool } from "@/lib/db";
import { formatEstonianDate, formatEstonianTime } from "@/lib/estonian-date";
import { AdminPageHeader } from "@/components/training/AdminPageHeader";

type Horse = { id: string; name: string; history_assignments: number; known_riders: number; upcoming_assignments: number };
type RiderHistory = { rider_id: string; rider_name: string; assignment_count: number };
type Upcoming = { session_id: string; title: string; starts_at: string | Date; rider_name: string; state: string };

export default async function HorsesPage({ searchParams }: { searchParams?: Promise<{ horse?: string }> }) {
  const params = (await searchParams) ?? {};
  const horsesRes = await pool.query<Horse>(
    `select h.id, h.name,
            coalesce(sum(hs.assignment_count), 0)::int as history_assignments,
            count(distinct hs.rider_id)::int as known_riders,
            count(distinct ha.id) filter (where s.starts_at >= now())::int as upcoming_assignments
     from public.horses h
     left join public.rider_horse_history_summary hs on hs.horse_id = h.id
     left join public.training_horse_assignments ha on ha.horse_id = h.id
     left join public.training_sessions s on s.id = ha.session_id
     where h.active = true group by h.id order by h.name`
  );
  const selected = horsesRes.rows.find((horse) => horse.id === params.horse) ?? horsesRes.rows[0] ?? null;
  const [historyRes, upcomingRes] = selected ? await Promise.all([
    pool.query<RiderHistory>(`select r.id as rider_id, r.display_name as rider_name, hs.assignment_count from public.rider_horse_history_summary hs join public.riders r on r.id = hs.rider_id where hs.horse_id = $1 order by hs.assignment_count desc, r.display_name limit 30`, [selected.id]),
    pool.query<Upcoming>(`select s.id as session_id, s.title, s.starts_at, r.display_name as rider_name, ha.state from public.training_horse_assignments ha join public.training_sessions s on s.id = ha.session_id join public.riders r on r.id = ha.rider_id where ha.horse_id = $1 and s.starts_at >= now() order by s.starts_at limit 20`, [selected.id]),
  ]) : [{ rows: [] as RiderHistory[] }, { rows: [] as Upcoming[] }];

  return <>
    <AdminPageHeader eyebrow="Koormus ja ajalugu" title="Hobused" description="Ülevaade tulevastest määramistest ja Excelist imporditud ratsaniku–hobuse ajaloost. Ajalugu on abimaterjal, mitte automaatne sobivusotsus." />
    <div className="grid gap-6 lg:grid-cols-[330px_minmax(0,1fr)]">
      <aside className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">{horsesRes.rows.map((horse) => <Link key={horse.id} href={`/admin/training/horses?horse=${horse.id}`} className={`rounded-2xl border p-4 shadow-sm transition ${selected?.id === horse.id ? "border-green-900 bg-green-900 text-white" : "border-stone-200 bg-white hover:border-green-700"}`}><div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className={`grid h-11 w-11 place-items-center rounded-full text-xl ${selected?.id === horse.id ? "bg-white/15" : "bg-[#dce7db] text-green-900"}`}>♞</span><div><h2 className="font-semibold">{horse.name}</h2><p className="text-xs opacity-65">{horse.known_riders} tuttavat ratsanikku</p></div></div>{horse.upcoming_assignments > 0 && <span className={`rounded-full px-2 py-1 text-xs font-bold ${selected?.id === horse.id ? "bg-white/15" : "bg-green-50 text-green-900"}`}>{horse.upcoming_assignments}</span>}</div></Link>)}</aside>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">{selected ? <><div className="flex items-start justify-between border-b border-stone-200 pb-6"><div><p className="text-xs font-bold uppercase tracking-wider text-green-800">Hobuse profiil</p><h2 className="mt-1 text-3xl font-semibold">{selected.name}</h2></div><div className="flex gap-2"><div className="rounded-xl bg-stone-50 px-4 py-2 text-center"><strong className="block text-xl">{selected.history_assignments}</strong><span className="text-[10px] text-stone-500">ajaloolist sõitu</span></div><div className="rounded-xl bg-[#dce7db] px-4 py-2 text-center"><strong className="block text-xl text-green-950">{selected.upcoming_assignments}</strong><span className="text-[10px] text-green-900">tulekul</span></div></div></div>
        <div className="mt-6 grid gap-7 xl:grid-cols-2"><div><h3 className="font-semibold">Tulevased trennid</h3><div className="mt-3 space-y-2">{upcomingRes.rows.map((item) => <Link key={`${item.session_id}-${item.rider_name}`} href={`/admin/training/calendar?session=${item.session_id}`} className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 p-3 transition hover:bg-[#ebe8df]"><div><p className="text-sm font-semibold">{item.rider_name}</p><p className="text-xs text-stone-500">{item.title || "Grupitrenn"} · {formatEstonianDate(item.starts_at)} {formatEstonianTime(item.starts_at)}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.state === "published" ? "bg-green-100 text-green-900" : "bg-amber-100 text-amber-900"}`}>{item.state === "published" ? "avaldatud" : "mustand"}</span></Link>)}{!upcomingRes.rows.length && <p className="rounded-xl bg-stone-50 p-5 text-sm text-stone-500">Tulevasi määramisi ei ole.</p>}</div></div>
          <div><h3 className="font-semibold">Kõige tuttavamad ratsanikud</h3><div className="mt-3 space-y-2">{historyRes.rows.map((item, index) => <Link key={item.rider_id} href={`/admin/training/riders?rider=${item.rider_id}`} className="flex items-center gap-3 rounded-xl border border-stone-100 p-3 hover:border-green-700"><span className="grid h-8 w-8 place-items-center rounded-full bg-stone-100 text-xs font-bold text-stone-600">{index + 1}</span><span className="min-w-0 flex-1 text-sm font-semibold">{item.rider_name}</span><span className="text-sm text-stone-500">{item.assignment_count}×</span></Link>)}{!historyRes.rows.length && <p className="text-sm text-stone-500">Ajaloolisi seoseid ei ole.</p>}</div></div></div>
      </> : <p className="py-20 text-center text-stone-500">Hobuseid ei ole sisestatud.</p>}</section>
    </div>
  </>;
}
