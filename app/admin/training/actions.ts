"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { pool } from "@/lib/db";
import { parseEstonianDate } from "@/lib/estonian-date";

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

function returnPath(formData: FormData, fallback: string) {
  const value = String(formData.get("return_to") ?? fallback);
  return value.startsWith("/admin/training") && !value.startsWith("//") ? value : fallback;
}

function finish(formData: FormData, fallback: string, message: string) {
  revalidatePath("/admin/training", "layout");
  const target = returnPath(formData, fallback);
  const separator = target.includes("?") ? "&" : "?";
  redirect(`${target}${separator}saved=${encodeURIComponent(message)}`);
}

export async function updatePolicy(formData: FormData) {
  const userId = await currentAdminUserId();
  await pool.query(
    `update public.training_policies
     set default_group_capacity = $1, waitlist_capacity = $2,
         credit_cutoff_time = $3::time, credit_expiry_months_after_session = $4,
         offer_hours_same_day = $5, offer_hours_previous_day = $6,
         offer_hours_earlier = $7, no_new_offer_minutes_before = $8,
         registration_minutes_before = $9, updated_by = $10
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
  finish(formData, "/admin/training/settings", "Reeglid salvestatud");
}

export async function createRider(formData: FormData) {
  await currentAdminUserId();
  const name = String(formData.get("name") ?? "").trim();
  const levelId = Number(formData.get("level_id"));
  if (!name) throw new Error("Ratsaniku nimi on kohustuslik");
  const result = await pool.query<{ id: string }>(
    `insert into public.riders (legal_name, display_name, level_id, profile_state, source)
     values ($1, $1, $2, 'basic', 'manual') returning id`,
    [name, levelId]
  );
  formData.set("return_to", `/admin/training/riders?rider=${result.rows[0].id}`);
  finish(formData, "/admin/training/riders", "Ratsanik lisatud");
}

export async function updateRider(formData: FormData) {
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
     set display_name = $1, level_id = $2, profile_state = $3,
         level_reviewed_at = case when level_id is distinct from $2 then now() else level_reviewed_at end,
         level_reviewed_by = case when level_id is distinct from $2 then $4 else level_reviewed_by end
     where id = $5`,
    [displayName, levelId, profileState, userId, id]
  );
  finish(formData, "/admin/training/riders", "Ratsaniku andmed salvestatud");
}

export async function archiveRider(formData: FormData) {
  const userId = await currentAdminUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Ratsanik on valimata");
  const client = await pool.connect();
  try {
    await client.query("begin");
    const riderRes = await client.query(
      `update public.riders set active = false, profile_state = 'archived'
       where id = $1 and active = true returning display_name`,
      [id]
    );
    if (riderRes.rowCount !== 1) throw new Error("Ratsanikku ei leitud");
    await client.query(
      `update public.training_group_memberships
       set status = 'inactive', ends_on = coalesce(ends_on, current_date)
       where rider_id = $1 and status <> 'inactive'`,
      [id]
    );
    await client.query(
      `insert into public.training_audit_log
         (actor_user_id, entity_type, entity_id, action, details)
       values ($1, 'rider', $2, 'archived', jsonb_build_object('display_name', $3::text))`,
      [userId, id, riderRes.rows[0].display_name]
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  formData.set("return_to", "/admin/training/riders");
  finish(formData, "/admin/training/riders", "Ratsanik arhiveeritud ja tema püsiajad lõpetatud");
}

export async function createGroup(formData: FormData) {
  await currentAdminUserId();
  const name = String(formData.get("name") ?? "").trim();
  const weekday = asPositiveInt(formData.get("weekday"), "Nädalapäev");
  const startTime = asTime(formData.get("start_time"), "Algusaeg");
  const capacity = asPositiveInt(formData.get("capacity"), "Kohtade arv");
  const levelIds = formData.getAll("level_ids").map(Number).filter(Number.isInteger);
  if (!name || weekday > 7) throw new Error("Grupi nimi või nädalapäev on vigane");
  const client = await pool.connect();
  let groupId = "";
  try {
    await client.query("begin");
    const groupRes = await client.query(
      `insert into public.training_groups (name, format, default_capacity, classification_status)
       values ($1, 'group', $2, $3) returning id`,
      [name, capacity, levelIds.length ? "classified" : "needs_review"]
    );
    groupId = groupRes.rows[0].id;
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
  formData.set("return_to", `/admin/training/groups?group=${groupId}`);
  finish(formData, "/admin/training/groups", "Grupp lisatud");
}

export async function updateGroup(formData: FormData) {
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
       set name = $1, default_capacity = $2, active = $3, classification_status = $4
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
  finish(formData, "/admin/training/groups", "Grupp salvestatud");
}

export async function addMembership(formData: FormData) {
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
         starts_on = coalesce(public.training_group_memberships.starts_on, current_date), updated_at = now()`,
    [riderId, slotId, status]
  );
  finish(formData, "/admin/training/riders", "Püsiaeg salvestatud");
}

export async function updateMembership(formData: FormData) {
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
  finish(formData, "/admin/training/riders", "Püsiaja olek muudetud");
}

export async function confirmGroupSuggestions(formData: FormData) {
  await currentAdminUserId();
  const slotId = String(formData.get("slot_id") ?? "");
  if (!slotId) throw new Error("Grupp on valimata");
  const result = await pool.query(
    `update public.training_group_memberships
     set status = 'active', confidence = 'confirmed', source = 'admin_bulk_confirmed',
         starts_on = coalesce(starts_on, current_date)
     where slot_id = $1 and status = 'suggested'`,
    [slotId]
  );
  const count = result.rowCount ?? 0;
  finish(formData, "/admin/training/groups", count ? `${count} grupiliiget kinnitatud` : "Kinnitamata soovitusi ei olnud");
}

export async function createSession(formData: FormData) {
  const userId = await currentAdminUserId();
  const slotId = String(formData.get("slot_id") ?? "");
  const sessionDate = parseEstonianDate(formData.get("session_date"), "Trenni kuupäev");
  if (!slotId) throw new Error("Püsiaeg on valimata");
  const client = await pool.connect();
  let created = false;
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
       where s.id = $1 and not exists (
         select 1 from public.training_sessions existing
         where existing.slot_id = s.id
           and (existing.starts_at at time zone s.timezone)::date = $2::date
       ) returning id`,
      [slotId, sessionDate, userId]
    );
    if (sessionRes.rowCount === 1) {
      created = true;
      await client.query(
        `insert into public.training_bookings
           (session_id, rider_id, booking_kind, status, source, created_by, updated_by)
         select $1, m.rider_id, 'recurring', 'confirmed', 'active_membership', $2, $2
         from public.training_group_memberships m
         where m.slot_id = $3 and m.status = 'active'
           and (m.starts_on is null or m.starts_on <= $4::date)
           and (m.ends_on is null or m.ends_on >= $4::date)
         on conflict (session_id, rider_id) do nothing`,
        [sessionRes.rows[0].id, userId, slotId, sessionDate]
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  finish(formData, "/admin/training/calendar", created ? "Kalendritrenn loodud" : "Selle grupi trenn oli juba olemas");
}

export async function generateSessions(formData: FormData) {
  const userId = await currentAdminUserId();
  const startDate = parseEstonianDate(formData.get("start_date"), "Alguskuupäev");
  const weeks = asPositiveInt(formData.get("weeks"), "Nädalate arv");
  if (weeks > 26) throw new Error("Korraga saab luua kuni 26 nädala trennid");
  const client = await pool.connect();
  let createdCount = 0;
  try {
    await client.query("begin");
    const result = await client.query<{ created_count: number }>(
      `with candidates as (
         select g.id as group_id, g.name, g.format, g.default_capacity,
                s.id as slot_id, s.start_time, s.duration_minutes, s.timezone,
                s.capacity_override, day_value::date as session_date
         from public.training_group_slots s
         join public.training_groups g on g.id = s.group_id and g.active = true
         cross join lateral generate_series(
           $1::date, $1::date + ($2::int * 7 - 1), interval '1 day'
         ) as calendar(day_value)
         where s.active = true and extract(isodow from day_value)::int = s.weekday
       ), created as (
         insert into public.training_sessions
           (group_id, slot_id, title, format, starts_at, ends_at, capacity, created_by, updated_by)
         select c.group_id, c.slot_id, c.name, c.format,
                ((c.session_date + c.start_time) at time zone c.timezone),
                ((c.session_date + c.start_time) at time zone c.timezone) + make_interval(mins => c.duration_minutes),
                coalesce(c.capacity_override, c.default_capacity), $3, $3
         from candidates c
         where not exists (
           select 1 from public.training_sessions existing
           where existing.slot_id = c.slot_id
             and (existing.starts_at at time zone c.timezone)::date = c.session_date
         ) returning id, slot_id, starts_at
       ), booked as (
         insert into public.training_bookings
           (session_id, rider_id, booking_kind, status, source, created_by, updated_by)
         select c.id, m.rider_id, 'recurring', 'confirmed', 'active_membership', $3, $3
         from created c
         join public.training_group_slots s on s.id = c.slot_id
         join public.training_group_memberships m on m.slot_id = c.slot_id and m.status = 'active'
         where (m.starts_on is null or m.starts_on <= (c.starts_at at time zone s.timezone)::date)
           and (m.ends_on is null or m.ends_on >= (c.starts_at at time zone s.timezone)::date)
         on conflict (session_id, rider_id) do nothing returning id
       ) select count(*)::int as created_count from created`,
      [startDate, weeks, userId]
    );
    createdCount = result.rows[0]?.created_count ?? 0;
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  finish(
    formData,
    "/admin/training/calendar",
    createdCount ? `${createdCount} kalendritrenni loodud` : "Kõik selle ajavahemiku trennid olid juba olemas"
  );
}

export async function updateSession(formData: FormData) {
  const userId = await currentAdminUserId();
  const id = String(formData.get("id") ?? "");
  const sessionDate = parseEstonianDate(formData.get("session_date"), "Trenni kuupäev");
  const startTime = asTime(formData.get("start_time"), "Trenni algusaeg");
  const capacity = asPositiveInt(formData.get("capacity"), "Kohtade arv");
  const status = String(formData.get("status") ?? "open");
  const cancellationCreditMode = String(formData.get("cancellation_credit_mode") ?? "none");
  if (!id || !["open", "cancelled", "completed"].includes(status) || !["all", "none"].includes(cancellationCreditMode)) {
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
    const durationMinutes = Math.max(
      1,
      Math.round((new Date(oldRes.rows[0].ends_at).getTime() - new Date(oldRes.rows[0].starts_at).getTime()) / 60000)
    );
    const updateRes = await client.query(
      `update public.training_sessions
       set starts_at = (($2::date + $3::time) at time zone 'Europe/Tallinn'),
           ends_at = (($2::date + $3::time) at time zone 'Europe/Tallinn') + make_interval(mins => $4),
           capacity = $5, status = $6,
           cancellation_credit_mode = case when $6 = 'cancelled' then $7 else null end,
           updated_by = $8
       where id = $1 returning starts_at`,
      [id, sessionDate, startTime, durationMinutes, capacity, status, cancellationCreditMode, userId]
    );
    if (new Date(oldRes.rows[0].starts_at).getTime() !== new Date(updateRes.rows[0].starts_at).getTime()) {
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
  finish(formData, "/admin/training/calendar", "Kalendritrenn salvestatud");
}

export async function assignHorse(formData: FormData) {
  const userId = await currentAdminUserId();
  const sessionId = String(formData.get("session_id") ?? "");
  const riderId = String(formData.get("rider_id") ?? "");
  const horseId = String(formData.get("horse_id") ?? "");
  if (!sessionId || !riderId) throw new Error("Ratsanik või trenn on valimata");

  if (!horseId) {
    await pool.query(
      `delete from public.training_horse_assignments where session_id = $1 and rider_id = $2`,
      [sessionId, riderId]
    );
    await pool.query(
      `update public.training_sessions set horse_assignment_state = 'draft', updated_by = $2 where id = $1`,
      [sessionId, userId]
    );
    finish(formData, "/admin/training/calendar", "Hobuse määrang eemaldatud");
  }

  const duplicate = await pool.query(
    `select 1 from public.training_horse_assignments
     where session_id = $1 and horse_id = $2 and rider_id <> $3 limit 1`,
    [sessionId, horseId, riderId]
  );
  if (duplicate.rowCount) throw new Error("See hobune on samas trennis juba teisele ratsanikule määratud");
  await pool.query(
    `insert into public.training_horse_assignments
       (session_id, rider_id, horse_id, state, source, assigned_by)
     values ($1, $2, $3, 'draft', 'manual', $4)
     on conflict (session_id, rider_id) do update
     set horse_id = excluded.horse_id, state = 'draft', source = 'manual', assigned_by = excluded.assigned_by`,
    [sessionId, riderId, horseId, userId]
  );
  await pool.query(
    `update public.training_sessions set horse_assignment_state = 'draft', updated_by = $2 where id = $1`,
    [sessionId, userId]
  );
  finish(formData, "/admin/training/calendar", "Hobune määratud; kasutajale ei ole seda veel avaldatud");
}

export async function publishHorseAssignments(formData: FormData) {
  const userId = await currentAdminUserId();
  const sessionId = String(formData.get("session_id") ?? "");
  if (!sessionId) throw new Error("Trenn on valimata");
  const missing = await pool.query<{ count: number }>(
    `select count(*)::int as count
     from public.training_bookings b
     left join public.training_horse_assignments ha
       on ha.session_id = b.session_id and ha.rider_id = b.rider_id
     where b.session_id = $1 and b.status in ('pending_trainer', 'confirmed') and ha.id is null`,
    [sessionId]
  );
  if ((missing.rows[0]?.count ?? 0) > 0) throw new Error("Enne avaldamist määra hobune kõigile trennis osalejatele");
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `update public.training_horse_assignments set state = 'published', assigned_by = $2 where session_id = $1`,
      [sessionId, userId]
    );
    await client.query(
      `update public.training_sessions set horse_assignment_state = 'published', updated_by = $2 where id = $1`,
      [sessionId, userId]
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  finish(formData, "/admin/training/calendar", "Hobused avaldatud ratsanike ja lapsevanemate vaates");
}
