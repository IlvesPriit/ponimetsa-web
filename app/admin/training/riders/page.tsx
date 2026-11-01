import Link from "next/link";
import { pool } from "@/lib/db";
import { formatEstonianDate } from "@/lib/estonian-date";
import { weekdayName } from "@/lib/training-admin";
import { AdminFeedback } from "@/components/training/AdminFeedback";
import { AdminPageHeader } from "@/components/training/AdminPageHeader";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { addMembership, archiveRider, createRider, updateMembership, updateRider } from "../actions";

type Level = { id: number; label: string };
type Rider = { id: string; display_name: string; legal_name: string; level_id: number; level_label: string; profile_state: string; source: string; membership_count: number; credit_count: number };
type Contact = { legal_name: string; relationship: string; email: string | null; phone: string | null };
type Membership = { id: string; status: string; confidence: string; group_name: string; weekday: number; start_time: string };
type Contract = { contract_number: string; start_date: string | Date | null; weekly_sessions: number | null; monthly_price_cents: number | null };
type History = { horse_name: string; assignment_count: number };
type Slot = { id: string; group_name: string; weekday: number; start_time: string };

export default async function RidersPage({ searchParams }: { searchParams?: Promise<{ q?: string; rider?: string; saved?: string }> }) {
  const params = (await searchParams) ?? {};
  const q = params.q?.trim() ?? "";
  const [ridersRes, levelsRes, slotsRes] = await Promise.all([
    pool.query<Rider>(
      `select r.id, r.display_name, r.legal_name, r.level_id, l.label as level_label, r.profile_state, r.source,
              count(distinct m.id) filter (where m.status = 'active')::int as membership_count,
              count(distinct c.id) filter (where c.state = 'available' and c.expires_at > now())::int as credit_count
       from public.riders r join public.training_levels l on l.id = r.level_id
       left join public.training_group_memberships m on m.rider_id = r.id
       left join public.training_credits c on c.rider_id = r.id
       where r.active = true and ($1 = '' or r.display_name ilike '%' || $1 || '%' or r.legal_name ilike '%' || $1 || '%')
       group by r.id, l.label order by r.display_name`, [q]
    ),
    pool.query<Level>(`select id, label from public.training_levels where active = true order by sort_order`),
    pool.query<Slot>(`select s.id, g.name as group_name, s.weekday, to_char(s.start_time, 'HH24:MI') as start_time from public.training_group_slots s join public.training_groups g on g.id = s.group_id where s.active and g.active order by s.weekday, s.start_time`),
  ]);
  const selected = ridersRes.rows.find((rider) => rider.id === params.rider) ?? ridersRes.rows[0] ?? null;
  const [contactsRes, membershipsRes, contractsRes, historyRes] = selected ? await Promise.all([
    pool.query<Contact>(`select c.legal_name, links.relationship, c.email, c.phone from public.rider_contact_links links join public.rider_contacts c on c.id = links.contact_id where links.rider_id = $1 and c.active order by links.primary_contact desc, c.legal_name`, [selected.id]),
    pool.query<Membership>(`select m.id, m.status, m.confidence, g.name as group_name, s.weekday, to_char(s.start_time, 'HH24:MI') as start_time from public.training_group_memberships m join public.training_group_slots s on s.id = m.slot_id join public.training_groups g on g.id = s.group_id where m.rider_id = $1 and m.status <> 'inactive' order by s.weekday, s.start_time`, [selected.id]),
    pool.query<Contract>(`select c.contract_number, c.start_date, t.weekly_sessions, t.monthly_price_cents from public.rider_contract_members cm join public.rider_contracts c on c.id = cm.contract_id left join lateral (select weekly_sessions, monthly_price_cents from public.rider_contract_terms where contract_id = c.id order by effective_from desc limit 1) t on true where cm.rider_id = $1 and c.active order by c.start_date desc`, [selected.id]),
    pool.query<History>(`select h.name as horse_name, hs.assignment_count from public.rider_horse_history_summary hs join public.horses h on h.id = hs.horse_id where hs.rider_id = $1 order by hs.assignment_count desc, h.name limit 8`, [selected.id]),
  ]) : [{ rows: [] as Contact[] }, { rows: [] as Membership[] }, { rows: [] as Contract[] }, { rows: [] as History[] }];
  const queryPart = q ? `&q=${encodeURIComponent(q)}` : "";
  const returnTo = selected ? `/admin/training/riders?rider=${selected.id}${queryPart}` : "/admin/training/riders";

  return <>
    <AdminPageHeader eyebrow="Inimesed ja lepingud" title="Ratsanikud" description="Otsi ratsanikku, vaata tema püsiaegu, krediite, kontakte ja varasemat hobuste ajalugu."
      actions={<details className="relative"><summary className="cursor-pointer list-none rounded-xl bg-green-900 px-4 py-2.5 text-sm font-semibold text-white">+ Lisa ratsanik</summary><form action={createRider} className="absolute right-0 z-20 mt-2 w-[min(92vw,360px)] space-y-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-xl"><input type="hidden" name="return_to" value="/admin/training/riders" /><label className="block text-xs font-semibold text-stone-600">Nimi<input name="name" required className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" /></label><label className="block text-xs font-semibold text-stone-600">Tase<select name="level_id" className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm">{levelsRes.rows.map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}</select></label><SubmitButton pendingLabel="Lisan…" className="w-full rounded-xl bg-green-900 px-4 py-2.5 text-sm font-semibold text-white">Lisa ratsanik</SubmitButton></form></details>} />
    <AdminFeedback message={params.saved} />

    <div className="grid min-h-[690px] gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
        <form method="get" className="flex gap-2"><input name="q" defaultValue={q} placeholder="Otsi nime järgi…" className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm" /><button className="rounded-xl bg-stone-100 px-3 text-sm font-semibold" aria-label="Otsi">⌕</button></form>
        <p className="my-3 px-1 text-xs text-stone-500">{ridersRes.rowCount ?? 0} ratsanikku</p>
        <div className="max-h-[610px] space-y-1 overflow-y-auto pr-1">{ridersRes.rows.map((rider) => <Link key={rider.id} href={`/admin/training/riders?rider=${rider.id}${queryPart}`} className={`flex items-center gap-3 rounded-2xl p-3 transition ${selected?.id === rider.id ? "bg-green-900 text-white shadow-sm" : "hover:bg-stone-50"}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${selected?.id === rider.id ? "bg-white/15" : "bg-[#dce7db] text-green-900"}`}>{rider.display_name.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{rider.display_name}</strong><span className={`block truncate text-xs ${selected?.id === rider.id ? "text-white/70" : "text-stone-500"}`}>{rider.level_label} · {rider.membership_count || "–"} püsiaega</span></span>{rider.credit_count > 0 && <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${selected?.id === rider.id ? "bg-amber-300 text-amber-950" : "bg-amber-100 text-amber-900"}`}>{rider.credit_count} kr</span>}</Link>)}{!ridersRes.rows.length && <p className="py-12 text-center text-sm text-stone-500">Otsingule vastavaid ratsanikke ei leitud.</p>}</div>
      </aside>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        {selected ? <>
          <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-center gap-4"><span className="grid h-16 w-16 place-items-center rounded-full bg-[#dce7db] text-2xl font-semibold text-green-900">{selected.display_name.slice(0, 1).toUpperCase()}</span><div><h2 className="text-2xl font-semibold">{selected.display_name}</h2><p className="mt-1 text-sm text-stone-500">{selected.level_label} · {selected.profile_state === "complete" ? "täielik profiil" : "baasprofiil"}</p></div></div><Link href={`/admin/training/preview?rider_id=${selected.id}`} className="rounded-xl border px-4 py-2 text-sm font-semibold text-green-900">Vaata kasutajavaadet</Link></div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="space-y-6"><div><h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">Püsiajad</h3><div className="mt-3 space-y-2">{membershipsRes.rows.map((membership) => <div key={membership.id} className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 p-3"><div><p className="text-sm font-semibold">{weekdayName(membership.weekday)} {membership.start_time}</p><p className="text-xs text-stone-500">{membership.group_name} · {membership.confidence === "confirmed" ? "kinnitatud" : "vajab kontrolli"}</p></div><form action={updateMembership} className="flex gap-2"><input type="hidden" name="id" value={membership.id} /><input type="hidden" name="return_to" value={returnTo} /><select name="status" defaultValue={membership.status} className="rounded-lg border px-2 py-1.5 text-xs"><option value="suggested">Soovitus</option><option value="active">Aktiivne</option><option value="inactive">Lõpetatud</option></select><SubmitButton pendingLabel="…" className="rounded-lg border px-2 text-xs">✓</SubmitButton></form></div>)}{!membershipsRes.rows.length && <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">Püsiaegu ei ole veel määratud.</p>}</div><form action={addMembership} className="mt-3 flex flex-col gap-2 sm:flex-row"><input type="hidden" name="rider_id" value={selected.id} /><input type="hidden" name="status" value="active" /><input type="hidden" name="return_to" value={returnTo} /><select name="slot_id" required className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm"><option value="">Lisa püsiaeg…</option>{slotsRes.rows.map((slot) => <option key={slot.id} value={slot.id}>{weekdayName(slot.weekday)} {slot.start_time} · {slot.group_name}</option>)}</select><SubmitButton pendingLabel="Lisan…" className="rounded-xl border border-green-800 px-4 py-2 text-sm font-semibold text-green-900">Lisa</SubmitButton></form></div>
              <div><h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">Kontaktid</h3><div className="mt-3 space-y-2">{contactsRes.rows.map((contact) => <div key={`${contact.legal_name}-${contact.relationship}`} className="rounded-xl bg-stone-50 p-3"><p className="text-sm font-semibold">{contact.legal_name} <span className="font-normal text-stone-500">· {contact.relationship === "parent" ? "lapsevanem" : contact.relationship === "self" ? "ratsanik ise" : "kontakt"}</span></p><p className="mt-1 text-xs text-stone-500">{contact.email ?? "E-post puudub"}{contact.phone ? ` · ${contact.phone}` : ""}</p></div>)}{!contactsRes.rows.length && <p className="text-sm text-stone-500">Kontakte ei ole sisestatud.</p>}</div></div>
            </div>

            <div className="space-y-6"><div><h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">Leping ja krediidid</h3><div className="mt-3 rounded-2xl bg-[#ebe8df] p-4">{contractsRes.rows[0] ? <><p className="font-semibold">Leping {contractsRes.rows[0].contract_number}</p><p className="mt-1 text-sm text-stone-600">{contractsRes.rows[0].weekly_sessions ?? "–"} korda nädalas{contractsRes.rows[0].monthly_price_cents != null ? ` · ${(contractsRes.rows[0].monthly_price_cents / 100).toFixed(0)} € kuus` : ""}</p>{contractsRes.rows[0].start_date && <p className="mt-1 text-xs text-stone-500">Alates {formatEstonianDate(contractsRes.rows[0].start_date)}</p>}</> : <p className="text-sm text-stone-600">Aktiivset lepingut ei ole seotud.</p>}<div className="mt-4 flex items-center justify-between border-t border-stone-300 pt-3"><span className="text-sm">Kasutamata krediite</span><strong className="text-2xl text-green-900">{selected.credit_count}</strong></div></div></div>
              <div><h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">Varasemad hobused</h3><div className="mt-3 flex flex-wrap gap-2">{historyRes.rows.map((item) => <span key={item.horse_name} className="rounded-full border border-stone-200 px-3 py-1.5 text-sm"><strong>{item.horse_name}</strong> <span className="text-stone-500">× {item.assignment_count}</span></span>)}{!historyRes.rows.length && <p className="text-sm text-stone-500">Ajaloolisi määramisi ei ole.</p>}</div><p className="mt-2 text-xs text-stone-400">Ajalugu on abiks, kuid ei kinnita automaatselt hobuse sobivust.</p></div>
              <details className="rounded-2xl border border-stone-200 p-4"><summary className="cursor-pointer text-sm font-semibold text-green-800">Muuda profiili</summary><form action={updateRider} className="mt-4 grid gap-3 sm:grid-cols-2"><input type="hidden" name="id" value={selected.id} /><input type="hidden" name="return_to" value={returnTo} /><label className="text-xs font-semibold text-stone-600">Kuvatav nimi<input name="display_name" defaultValue={selected.display_name} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" /></label><label className="text-xs font-semibold text-stone-600">Tase<select name="level_id" defaultValue={selected.level_id} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm">{levelsRes.rows.map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}</select></label><input type="hidden" name="profile_state" value={selected.profile_state} /><SubmitButton pendingLabel="Salvestan…" className="sm:col-span-2 rounded-xl bg-green-900 px-4 py-2.5 text-sm font-semibold text-white">Salvesta profiil</SubmitButton></form><form action={archiveRider} className="mt-4 border-t pt-4"><input type="hidden" name="id" value={selected.id} /><SubmitButton confirmMessage={`Kas eemaldada ${selected.display_name}? Profiil arhiveeritakse ja püsiajad lõpetatakse.`} pendingLabel="Eemaldan…" className="text-sm font-semibold text-red-700">Eemalda ratsanik</SubmitButton></form></details>
            </div>
          </div>
        </> : <div className="py-20 text-center"><h2 className="font-semibold">Ratsanikku pole valitud</h2><p className="mt-2 text-sm text-stone-500">Vali vasakult ratsanik või muuda otsingut.</p></div>}
      </section>
    </div>
  </>;
}
