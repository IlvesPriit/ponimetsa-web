import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { pool } from "@/lib/db";

const WEEKDAYS = [
  [1, "Esmaspäev"],
  [2, "Teisipäev"],
  [3, "Kolmapäev"],
  [4, "Neljapäev"],
  [5, "Reede"],
  [6, "Laupäev"],
  [7, "Pühapäev"],
] as const;

type LevelRow = { id: number; label: string };
type RiderRow = {
  id: string;
  display_name: string;
  level_id: number;
  profile_state: string;
  source: string;
  level_label: string;
};
type GroupRow = {
  group_id: string;
  name: string;
  default_capacity: number;
  classification_status: string;
  active: boolean;
  slot_id: string;
  weekday: number;
  start_time: string;
  level_ids: number[];
  active_members: number;
};
type MembershipRow = {
  id: string;
  status: string;
  confidence: string;
  source: string;
  notes: string;
  rider_name: string;
  group_name: string;
};
type SessionRow = {
  id: string;
  title: string;
  starts_at: string | Date;
  ends_at: string | Date;
  capacity: number;
  status: string;
  cancellation_credit_mode: "all" | "none" | null;
  riders: number;
};

function asPositiveInt(value: FormDataEntryValue | null, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${label} peab olema positiivne täisarv`);
  return parsed;
}

function asNonNegativeInt(value: FormDataEntryValue | null, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${label} peab olema null või positiivne täisarv`);
  return parsed;
}

function asTime(value: FormDataEntryValue | null, label: string) {
  const text = String(value ?? "").trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) throw new Error(`${label} on vigane`);
  return text;
}

async function currentAdminUserId() {
  await requireAdmin("/admin/training");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/admin/training");
  return data.user.id;
}

function refresh(message: string) {
  revalidatePath("/admin/training");
  redirect(`/admin/training?saved=${encodeURIComponent(message)}`);
}

export default async function AdminTrainingPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string }>;
}) {
  await requireAdmin("/admin/training");
  const params = (await searchParams) ?? {};

  async function updatePolicy(formData: FormData) {
    "use server";
    const userId = await currentAdminUserId();
    await pool.query(
      `update public.training_policies
       set default_group_capacity = $1,
           waitlist_capacity = $2,
           credit_cutoff_time = $3::time,
           credit_expiry_months_after_session = $4,
           offer_hours_same_day = $5,
           offer_hours_previous_day = $6,
           offer_hours_earlier = $7,
           no_new_offer_minutes_before = $8,
           registration_minutes_before = $9,
           updated_by = $10
       where id = 'main'`,
      [
        asPositiveInt(formData.get("default_group_capacity"), "Grupi suurus"),
        asNonNegativeInt(formData.get("waitlist_capacity"), "Ootenimekirja suurus"),
        asTime(formData.get("credit_cutoff_time"), "Krediidi tähtaeg"),
        asNonNegativeInt(formData.get("credit_expiry_months_after_session"), "Krediidi kehtivus"),
        asPositiveInt(formData.get("offer_hours_same_day"), "Sama päeva pakkumine"),
        asPositiveInt(formData.get("offer_hours_previous_day"), "Eelmise päeva pakkumine"),
        asPositiveInt(formData.get("offer_hours_earlier"), "Varasem pakkumine"),
        asNonNegativeInt(formData.get("no_new_offer_minutes_before"), "Kutsete sulgemine"),
        asNonNegativeInt(formData.get("registration_minutes_before"), "Registreerimise sulgemine"),
        userId,
      ]
    );
    refresh("Reeglid salvestatud");
  }

  async function createRider(formData: FormData) {
    "use server";
    await currentAdminUserId();
    const name = String(formData.get("name") ?? "").trim();
    const levelId = Number(formData.get("level_id"));
    if (!name) throw new Error("Ratsaniku nimi on kohustuslik");
    await pool.query(
      `insert into public.riders (legal_name, display_name, level_id, profile_state, source)
       values ($1, $1, $2, 'basic', 'manual')`,
      [name, levelId]
    );
    refresh("Ratsanik lisatud");
  }

  async function updateRider(formData: FormData) {
    "use server";
    const userId = await currentAdminUserId();
    const id = String(formData.get("id") ?? "");
    const displayName = String(formData.get("display_name") ?? "").trim();
    const levelId = Number(formData.get("level_id"));
    const profileState = String(formData.get("profile_state") ?? "basic");
    if (!id || !displayName) throw new Error("Ratsaniku andmed on puudulikud");
    if (!["basic", "complete", "needs_merge", "archived"].includes(profileState)) {
      throw new Error("Profiili olek on vigane");
    }
    await pool.query(
      `update public.riders
       set display_name = $1,
           level_id = $2,
           profile_state = $3,
           level_reviewed_at = case when level_id is distinct from $2 then now() else level_reviewed_at end,
           level_reviewed_by = case when level_id is distinct from $2 then $4 else level_reviewed_by end
       where id = $5`,
      [displayName, levelId, profileState, userId, id]
    );
    refresh("Ratsaniku andmed salvestatud");
  }

  async function createGroup(formData: FormData) {
    "use server";
    await currentAdminUserId();
    const name = String(formData.get("name") ?? "").trim();
    const weekday = asPositiveInt(formData.get("weekday"), "Nädalapäev");
    const startTime = asTime(formData.get("start_time"), "Algusaeg");
    const capacity = asPositiveInt(formData.get("capacity"), "Kohtade arv");
    const levelIds = formData.getAll("level_ids").map(Number).filter(Number.isInteger);
    if (!name || weekday > 7) throw new Error("Grupi nimi või nädalapäev on vigane");

    const client = await pool.connect();
    try {
      await client.query("begin");
      const groupRes = await client.query(
        `insert into public.training_groups (name, format, default_capacity, classification_status)
         values ($1, 'group', $2, $3)
         returning id`,
        [name, capacity, levelIds.length ? "classified" : "needs_review"]
      );
      const groupId = groupRes.rows[0].id;
      await client.query(
        `insert into public.training_group_slots (group_id, weekday, start_time, duration_minutes)
         values ($1, $2, $3::time, 50)`,
        [groupId, weekday, startTime]
      );
      if (levelIds.length) {
        await client.query(
          `insert into public.training_group_levels (group_id, level_id)
           select $1, unnest($2::smallint[])`,
          [groupId, levelIds]
        );
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    refresh("Grupp lisatud");
  }

  async function updateGroup(formData: FormData) {
    "use server";
    await currentAdminUserId();
    const groupId = String(formData.get("group_id") ?? "");
    const slotId = String(formData.get("slot_id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const weekday = asPositiveInt(formData.get("weekday"), "Nädalapäev");
    const startTime = asTime(formData.get("start_time"), "Algusaeg");
    const capacity = asPositiveInt(formData.get("capacity"), "Kohtade arv");
    const active = formData.get("active") === "on";
    const levelIds = formData.getAll("level_ids").map(Number).filter(Number.isInteger);
    if (!groupId || !slotId || !name || weekday > 7) throw new Error("Grupi andmed on puudulikud");

    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(
        `update public.training_groups
         set name = $1, default_capacity = $2, active = $3,
             classification_status = $4
         where id = $5`,
        [name, capacity, active, levelIds.length ? "classified" : "needs_review", groupId]
      );
      await client.query(
        `update public.training_group_slots
         set weekday = $1, start_time = $2::time, active = $3
         where id = $4 and group_id = $5`,
        [weekday, startTime, active, slotId, groupId]
      );
      await client.query(`delete from public.training_group_levels where group_id = $1`, [groupId]);
      if (levelIds.length) {
        await client.query(
          `insert into public.training_group_levels (group_id, level_id)
           select $1, unnest($2::smallint[])`,
          [groupId, levelIds]
        );
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    refresh("Grupp salvestatud");
  }

  async function addMembership(formData: FormData) {
    "use server";
    await currentAdminUserId();
    const riderId = String(formData.get("rider_id") ?? "");
    const slotId = String(formData.get("slot_id") ?? "");
    const status = String(formData.get("status") ?? "active");
    if (!riderId || !slotId || !["suggested", "active", "inactive"].includes(status)) {
      throw new Error("Püsiaja andmed on puudulikud");
    }
    await pool.query(
      `insert into public.training_group_memberships
         (rider_id, slot_id, status, confidence, source, starts_on)
       values ($1, $2, $3, 'confirmed', 'manual', current_date)
       on conflict (rider_id, slot_id) do update
       set status = excluded.status, confidence = 'confirmed', source = 'manual',
           starts_on = coalesce(public.training_group_memberships.starts_on, current_date),
           updated_at = now()`,
      [riderId, slotId, status]
    );
    refresh("Püsiaeg salvestatud");
  }

  async function updateMembership(formData: FormData) {
    "use server";
    await currentAdminUserId();
    const id = String(formData.get("id") ?? "");
    const status = String(formData.get("status") ?? "suggested");
    if (!id || !["suggested", "active", "inactive"].includes(status)) throw new Error("Püsiaja olek on vigane");
    await pool.query(
      `update public.training_group_memberships
       set status = $1,
           confidence = case when $1 = 'active' then 'confirmed' else confidence end,
           source = case when $1 = 'active' then 'admin_confirmed' else source end
       where id = $2`,
      [status, id]
    );
    refresh("Püsiaja olek muudetud");
  }

  async function createSession(formData: FormData) {
    "use server";
    const userId = await currentAdminUserId();
    const slotId = String(formData.get("slot_id") ?? "");
    const sessionDate = String(formData.get("session_date") ?? "");
    if (!slotId || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) throw new Error("Trenni kuupäev on vigane");

    const client = await pool.connect();
    try {
      await client.query("begin");
      const sessionRes = await client.query(
        `insert into public.training_sessions
           (group_id, slot_id, title, format, starts_at, ends_at, capacity, created_by, updated_by)
         select g.id, s.id, g.name, g.format,
                (($2::date + s.start_time) at time zone s.timezone),
                (($2::date + s.start_time) at time zone s.timezone) + make_interval(mins => s.duration_minutes),
                coalesce(s.capacity_override, g.default_capacity), $3, $3
         from public.training_group_slots s
         join public.training_groups g on g.id = s.group_id
         where s.id = $1
         returning id`,
        [slotId, sessionDate, userId]
      );
      if (sessionRes.rowCount !== 1) throw new Error("Püsiaega ei leitud");
      const sessionId = sessionRes.rows[0].id;
      await client.query(
        `insert into public.training_bookings
           (session_id, rider_id, booking_kind, status, source, created_by, updated_by)
         select $1, m.rider_id, 'recurring', 'confirmed', 'active_membership', $2, $2
         from public.training_group_memberships m
         where m.slot_id = $3
           and m.status = 'active'
           and (m.starts_on is null or m.starts_on <= $4::date)
           and (m.ends_on is null or m.ends_on >= $4::date)
         on conflict (session_id, rider_id) do nothing`,
        [sessionId, userId, slotId, sessionDate]
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    refresh("Kalendritrenn loodud");
  }

  async function updateSession(formData: FormData) {
    "use server";
    const userId = await currentAdminUserId();
    const id = String(formData.get("id") ?? "");
    const sessionDate = String(formData.get("session_date") ?? "");
    const startTime = asTime(formData.get("start_time"), "Trenni algusaeg");
    const capacity = asPositiveInt(formData.get("capacity"), "Kohtade arv");
    const status = String(formData.get("status") ?? "open");
    const cancellationCreditMode = String(formData.get("cancellation_credit_mode") ?? "none");
    if (
      !id ||
      !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate) ||
      !["open", "cancelled", "completed"].includes(status) ||
      !["all", "none"].includes(cancellationCreditMode)
    ) {
      throw new Error("Trenni andmed on vigased");
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      const oldRes = await client.query(
        `select starts_at, ends_at from public.training_sessions where id = $1 for update`,
        [id]
      );
      if (oldRes.rowCount !== 1) throw new Error("Trenni ei leitud");
      const durationMs = new Date(oldRes.rows[0].ends_at).getTime() - new Date(oldRes.rows[0].starts_at).getTime();
      const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
      const updateRes = await client.query(
        `update public.training_sessions
         set starts_at = (($2::date + $3::time) at time zone 'Europe/Tallinn'),
             ends_at = (($2::date + $3::time) at time zone 'Europe/Tallinn') + make_interval(mins => $4),
             capacity = $5, status = $6,
             cancellation_credit_mode = case when $6 = 'cancelled' then $7 else null end,
             updated_by = $8
         where id = $1
         returning starts_at`,
        [id, sessionDate, startTime, durationMinutes, capacity, status, cancellationCreditMode, userId]
      );
      const oldStart = new Date(oldRes.rows[0].starts_at).getTime();
      const newStart = new Date(updateRes.rows[0].starts_at).getTime();
      if (oldStart !== newStart) {
        await client.query(
          `insert into public.training_notifications
             (rider_id, contact_id, session_id, kind, channel, payload)
           select b.rider_id, l.contact_id, b.session_id, 'session_time_changed', 'email',
                  jsonb_build_object('old_start', $2::timestamptz, 'new_start', $3::timestamptz)
           from public.training_bookings b
           join public.rider_contact_links l on l.rider_id = b.rider_id and l.receives_notifications = true
           join public.rider_contacts c on c.id = l.contact_id and c.email is not null
           cross join public.training_policies p
           where p.id = 'main' and p.customer_notifications_enabled = true
             and b.session_id = $1 and b.status in ('confirmed', 'pending_trainer')`,
          [id, oldRes.rows[0].starts_at, updateRes.rows[0].starts_at]
        );
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    refresh("Kalendritrenn salvestatud");
  }

  const [policyRes, levelRes, riderRes, groupRes, membershipRes, sessionRes] = await Promise.all([
    pool.query(`select * from public.training_policies where id = 'main'`),
    pool.query(`select id, label from public.training_levels where active = true order by sort_order`),
    pool.query(
      `select r.id, r.display_name, r.level_id, r.profile_state, r.source, l.label as level_label
       from public.riders r join public.training_levels l on l.id = r.level_id
       where r.active = true order by r.display_name`
    ),
    pool.query(
      `select g.id as group_id, g.name, g.default_capacity, g.classification_status, g.active,
              s.id as slot_id, s.weekday, to_char(s.start_time, 'HH24:MI') as start_time,
              coalesce(array_agg(gl.level_id order by gl.level_id) filter (where gl.level_id is not null), '{}') as level_ids,
              count(distinct m.id) filter (where m.status = 'active')::int as active_members
       from public.training_groups g
       join public.training_group_slots s on s.group_id = g.id
       left join public.training_group_levels gl on gl.group_id = g.id
       left join public.training_group_memberships m on m.slot_id = s.id
       group by g.id, s.id order by s.weekday, s.start_time`
    ),
    pool.query(
      `select m.id, m.status, m.confidence, m.source, m.notes,
              r.display_name as rider_name, g.name as group_name
       from public.training_group_memberships m
       join public.riders r on r.id = m.rider_id
       join public.training_group_slots s on s.id = m.slot_id
       join public.training_groups g on g.id = s.group_id
       order by case m.status when 'suggested' then 0 when 'active' then 1 else 2 end,
                g.name, r.display_name limit 250`
    ),
    pool.query(
      `select ts.id, ts.title, ts.starts_at, ts.ends_at, ts.capacity, ts.status,
              ts.cancellation_credit_mode,
              count(tb.id) filter (where tb.status in ('confirmed', 'pending_trainer'))::int as riders
       from public.training_sessions ts
       left join public.training_bookings tb on tb.session_id = ts.id
       where ts.starts_at >= now() - interval '1 day'
       group by ts.id order by ts.starts_at limit 60`
    ),
  ]);

  const policy = policyRes.rows[0];
  const levels = levelRes.rows as LevelRow[];
  const riders = riderRes.rows as RiderRow[];
  const groups = groupRes.rows as GroupRow[];
  const memberships = membershipRes.rows as MembershipRow[];
  const sessions = sessionRes.rows as SessionRow[];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Tallinn" }).format(new Date());

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Grupitreeningute haldus</h1>
          <p className="mt-2 text-gray-700">Ratsanikud, tasemed, püsigrupid ja kalendritrennid.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/training/preview" className="rounded-xl border border-green-800 bg-green-50 px-4 py-2 text-sm font-medium text-green-900">Testi kasutajavaadet</Link>
          <Link href="/admin" className="rounded-xl border px-4 py-2 text-sm font-medium">← Admin</Link>
        </div>
      </div>

      {params.saved && (
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          {params.saved}
        </div>
      )}

      {!policy.customer_notifications_enabled && (
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Testrežiim: grupitreeningute klienditeavitused on välja lülitatud. Aja muutmine ei saada ega lisa saatmisjärjekorda ühtegi kirja.
        </div>
      )}

      <section className="mt-10 rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">Reeglid</h2>
        <form action={updatePolicy} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["default_group_capacity", "Grupi vaikimisi suurus", policy.default_group_capacity],
            ["waitlist_capacity", "Ootenimekirja suurus", policy.waitlist_capacity],
            ["credit_expiry_months_after_session", "Krediit kehtib kuid", policy.credit_expiry_months_after_session],
            ["offer_hours_same_day", "Sama päeva pakkumine h", policy.offer_hours_same_day],
            ["offer_hours_previous_day", "Eelmise päeva pakkumine h", policy.offer_hours_previous_day],
            ["offer_hours_earlier", "Varasem pakkumine h", policy.offer_hours_earlier],
            ["no_new_offer_minutes_before", "Uusi kutseid ei saadeta min", policy.no_new_offer_minutes_before],
            ["registration_minutes_before", "Vabale kohale reg min", policy.registration_minutes_before],
          ].map(([name, label, value]) => (
            <label key={String(name)} className="text-sm">
              <span className="font-medium">{String(label)}</span>
              <input name={String(name)} type="number" min="0" defaultValue={String(value)} className="mt-1 w-full rounded-xl border px-3 py-2" />
            </label>
          ))}
          <label className="text-sm">
            <span className="font-medium">Krediidi tähtaeg</span>
            <input name="credit_cutoff_time" type="time" defaultValue={String(policy.credit_cutoff_time).slice(0, 5)} className="mt-1 w-full rounded-xl border px-3 py-2" />
          </label>
          <div className="flex items-end">
            <button className="w-full rounded-xl bg-green-800 px-4 py-2 text-sm font-medium text-white">Salvesta reeglid</button>
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">Ratsanikud ja tasemed</h2>
        <form action={createRider} className="mt-4 flex flex-wrap gap-3">
          <input name="name" placeholder="Uue ratsaniku nimi" className="min-w-64 flex-1 rounded-xl border px-3 py-2" required />
          <select name="level_id" defaultValue="0" className="rounded-xl border px-3 py-2">
            {levels.map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}
          </select>
          <button className="rounded-xl border border-green-800 px-4 py-2 text-sm font-medium text-green-900">Lisa ratsanik</button>
        </form>
        <div className="mt-5 max-h-[34rem] overflow-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-neutral-50"><tr><th className="px-3 py-2">Nimi</th><th className="px-3 py-2">Tase</th><th className="px-3 py-2">Profiil</th><th className="px-3 py-2">Allikas</th><th className="px-3 py-2"></th></tr></thead>
            <tbody>
              {riders.map((rider) => (
                <tr key={rider.id} className="border-t">
                  <td colSpan={5} className="p-0">
                    <form action={updateRider} className="grid grid-cols-[minmax(12rem,1fr)_12rem_11rem_10rem_auto] items-center gap-2 px-3 py-2">
                      <input type="hidden" name="id" value={rider.id} />
                      <input name="display_name" defaultValue={rider.display_name} className="rounded-lg border px-2 py-1.5" />
                      <select name="level_id" defaultValue={rider.level_id} className="rounded-lg border px-2 py-1.5">
                        {levels.map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}
                      </select>
                      <select name="profile_state" defaultValue={rider.profile_state} className="rounded-lg border px-2 py-1.5">
                        <option value="basic">Algeline</option><option value="complete">Täidetud</option><option value="needs_merge">Kontrolli nime</option><option value="archived">Arhiveeritud</option>
                      </select>
                      <span className="truncate text-xs text-gray-500">{rider.source}</span>
                      <button className="rounded-lg border px-3 py-1.5 text-xs font-medium">Salvesta</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">Grupid ja lubatud tasemed</h2>
        <form action={createGroup} className="mt-4 grid gap-3 lg:grid-cols-[1fr_11rem_9rem_8rem_2fr_auto]">
          <input name="name" placeholder="Grupi nimi" className="rounded-xl border px-3 py-2" required />
          <select name="weekday" defaultValue="2" className="rounded-xl border px-3 py-2">{WEEKDAYS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
          <input name="start_time" type="time" defaultValue="17:00" className="rounded-xl border px-3 py-2" />
          <input name="capacity" type="number" min="1" defaultValue="7" className="rounded-xl border px-3 py-2" />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-3 py-2">
            {levels.filter((level) => level.id > 0).map((level) => <label key={level.id} className="text-xs"><input type="checkbox" name="level_ids" value={level.id} className="mr-1" />{level.label}</label>)}
          </div>
          <button className="rounded-xl bg-green-800 px-4 py-2 text-sm font-medium text-white">Lisa grupp</button>
        </form>
        <div className="mt-6 space-y-3">
          {groups.map((group) => (
            <form key={group.slot_id} action={updateGroup} className="rounded-xl border p-4">
              <input type="hidden" name="group_id" value={group.group_id} /><input type="hidden" name="slot_id" value={group.slot_id} />
              <div className="grid gap-3 lg:grid-cols-[1fr_11rem_9rem_7rem_auto]">
                <input name="name" defaultValue={group.name} className="rounded-lg border px-3 py-2 font-medium" />
                <select name="weekday" defaultValue={group.weekday} className="rounded-lg border px-3 py-2">{WEEKDAYS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
                <input name="start_time" type="time" defaultValue={group.start_time} className="rounded-lg border px-3 py-2" />
                <input name="capacity" type="number" min="1" defaultValue={group.default_capacity} className="rounded-lg border px-3 py-2" />
                <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={group.active} />Aktiivne</label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {levels.filter((level) => level.id > 0).map((level) => <label key={level.id} className="text-xs"><input type="checkbox" name="level_ids" value={level.id} defaultChecked={(group.level_ids ?? []).includes(level.id)} className="mr-1" />{level.label}</label>)}
                <span className="ml-auto text-xs text-gray-500">Aktiivseid püsiliikmeid: {group.active_members} · {group.classification_status === "classified" ? "tasemed määratud" : "tasemed määramata"}</span>
                <button className="rounded-lg border px-3 py-1.5 text-xs font-medium">Salvesta grupp</button>
              </div>
            </form>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">Ratsanike püsiajad</h2>
        <form action={addMembership} className="mt-4 flex flex-wrap gap-3">
          <select name="rider_id" className="min-w-64 flex-1 rounded-xl border px-3 py-2">{riders.map((rider) => <option key={rider.id} value={rider.id}>{rider.display_name}</option>)}</select>
          <select name="slot_id" className="min-w-56 rounded-xl border px-3 py-2">{groups.map((group) => <option key={group.slot_id} value={group.slot_id}>{group.name}</option>)}</select>
          <select name="status" defaultValue="active" className="rounded-xl border px-3 py-2"><option value="active">Aktiivne püsiaeg</option><option value="suggested">Soovitus</option></select>
          <button className="rounded-xl border border-green-800 px-4 py-2 text-sm font-medium text-green-900">Lisa püsiaeg</button>
        </form>
        <div className="mt-5 max-h-[32rem] overflow-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-neutral-50"><tr><th className="px-3 py-2">Ratsanik</th><th className="px-3 py-2">Grupp</th><th className="px-3 py-2">Kindlus</th><th className="px-3 py-2">Olek</th><th className="px-3 py-2"></th></tr></thead>
            <tbody>{memberships.map((membership) => (
              <tr key={membership.id} className="border-t">
                <td className="px-3 py-2 font-medium">{membership.rider_name}</td><td className="px-3 py-2">{membership.group_name}</td><td className="px-3 py-2 text-gray-600">{membership.confidence}</td>
                <td colSpan={2} className="px-3 py-2"><form action={updateMembership} className="flex gap-2"><input type="hidden" name="id" value={membership.id} /><select name="status" defaultValue={membership.status} className="rounded-lg border px-2 py-1"><option value="suggested">Soovitus</option><option value="active">Aktiivne</option><option value="inactive">Mitteaktiivne</option></select><button className="rounded-lg border px-3 py-1 text-xs font-medium">Salvesta</button></form></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">Kalendritrennid</h2>
        <p className="mt-1 text-sm text-gray-600">Uue trenni loomisel lisatakse kinnitatud püsigrupi liikmed automaatselt.</p>
        <form action={createSession} className="mt-4 flex flex-wrap gap-3">
          <select name="slot_id" className="min-w-64 flex-1 rounded-xl border px-3 py-2">{groups.filter((group) => group.active).map((group) => <option key={group.slot_id} value={group.slot_id}>{group.name}</option>)}</select>
          <input name="session_date" type="date" defaultValue={today} className="rounded-xl border px-3 py-2" required />
          <button className="rounded-xl bg-green-800 px-4 py-2 text-sm font-medium text-white">Loo kalendritrenn</button>
        </form>
        <div className="mt-5 space-y-2">
          {sessions.map((session) => {
            const starts = new Date(session.starts_at);
            const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Tallinn" }).format(starts);
            const localTime = starts.toLocaleTimeString("et-EE", { timeZone: "Europe/Tallinn", hour: "2-digit", minute: "2-digit", hour12: false });
            return (
              <form key={session.id} action={updateSession} className="grid items-center gap-2 rounded-xl border p-3 lg:grid-cols-[1fr_10rem_8rem_6rem_9rem_12rem_auto]">
                <input type="hidden" name="id" value={session.id} /><div><div className="font-medium">{session.title}</div><div className="text-xs text-gray-500">Kirjas {session.riders}/{session.capacity}</div></div>
                <input name="session_date" type="date" defaultValue={localDate} className="rounded-lg border px-2 py-1.5" /><input name="start_time" type="time" defaultValue={localTime} className="rounded-lg border px-2 py-1.5" /><input name="capacity" type="number" min="1" defaultValue={session.capacity} className="rounded-lg border px-2 py-1.5" />
                <select name="status" defaultValue={session.status} className="rounded-lg border px-2 py-1.5"><option value="open">Avatud</option><option value="completed">Toimunud</option><option value="cancelled">Tühistatud</option></select>
                <select name="cancellation_credit_mode" defaultValue={session.cancellation_credit_mode ?? "none"} className="rounded-lg border px-2 py-1.5" title="Rakendub siis, kui trenn märgitakse tühistatuks"><option value="none">Tühistamisel: krediiti ei saa</option><option value="all">Tühistamisel: krediit kõigile</option></select>
                <button className="rounded-lg border px-3 py-1.5 text-xs font-medium">Salvesta</button>
              </form>
            );
          })}
          {!sessions.length && <p className="text-sm text-gray-500">Kalendritrenne pole veel loodud.</p>}
        </div>
      </section>
    </div>
  );
}
