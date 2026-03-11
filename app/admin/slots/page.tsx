import Link from "next/link";
import { createClient } from "../../../lib/supabase/server";
import { pool } from "../../../lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../lib/admin";


function daysInMonth(year: number, month1to12: number) {
  return new Date(year, month1to12, 0).getDate();
}

function assertValidDateParts(day: string, month: string, year: string, label: string) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new Error(`${label}: vigane kuupäev`);
  }
  if (m < 1 || m > 12) throw new Error(`${label}: kuu peab olema 01–12`);

  const dim = daysInMonth(y, m);
  if (d < 1 || d > dim) {
    throw new Error(`${label}: valitud kuupäeva ei eksisteeri (päevi kuus: ${String(dim).padStart(2, "0")})`);
  }
}

function formatEtDateTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;

  // Use Intl parts so we can force dots and 24h output reliably.
  const parts = new Intl.DateTimeFormat("et-EE", {
    timeZone: "Europe/Tallinn",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const day = get("day");
  const month = get("month");
  const year = get("year");
  const hour = get("hour");
  const minute = get("minute");

  return `${day}.${month}.${year} ${hour}:${minute}`;
}

function getTallinnParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Tallinn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

function tallinnLocalToUtcIso(dateStr: string, timeStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  // Start with a UTC guess using the same wall-clock fields.
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0);

  // Refine against Europe/Tallinn local time. Two passes are enough here.
  for (let i = 0; i < 2; i += 1) {
    const actual = getTallinnParts(new Date(utcMs));
    const desiredNaive = Date.UTC(year, month - 1, day, hour, minute, 0);
    const actualNaive = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second || 0
    );
    utcMs -= actualNaive - desiredNaive;
  }

  return new Date(utcMs).toISOString();
}

export default async function AdminSlotsPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; cleaned?: string }>;
}) {
  await requireAdmin("/admin/slots");

  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  const userId = data.user?.id;
  if (!userId) {
    redirect("/login?next=/admin/slots");
  }

  const trainerLookup = await pool.query(
    `select id, display_name
     from public.trainers
     where user_id = $1 and is_active = true
     limit 1;`,
    [userId]
  );

  const trainer = trainerLookup.rows[0] as { id: string; display_name: string } | undefined;
  if (!trainer) {
    throw new Error("Treeneri profiili ei leitud (trainers). Lisa see Supabase'is või loo automaatselt.");
  }

  async function toggleSlotActive(formData: FormData) {
    "use server";

    const slotId = String(formData.get("id") ?? "").trim();
    const nextActiveRaw = String(formData.get("is_active") ?? "").trim();
    const nextActive = nextActiveRaw === "true";

    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) redirect("/login?next=/admin/slots");

    const trainerRes = await pool.query(
      `select id from public.trainers where user_id = $1 and is_active = true limit 1;`,
      [user.id]
    );
    if (trainerRes.rowCount === 0) throw new Error("Treeneri profiili ei leitud");
    const trainerId = trainerRes.rows[0].id as string;

    await pool.query(
      `update public.availability_slots
       set is_active = $1
       where id = $2 and trainer_id = $3;`,
      [nextActive, slotId, trainerId]
    );

    revalidatePath("/admin/slots");
    redirect("/admin/slots");
  }

  async function deleteSlot(formData: FormData) {
    "use server";

    const slotId = String(formData.get("id") ?? "").trim();

    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) redirect("/login?next=/admin/slots");

    const trainerRes = await pool.query(
      `select id from public.trainers where user_id = $1 and is_active = true limit 1;`,
      [user.id]
    );
    if (trainerRes.rowCount === 0) throw new Error("Treeneri profiili ei leitud");
    const trainerId = trainerRes.rows[0].id as string;

    await pool.query(
      `delete from public.availability_slots
       where id = $1 and trainer_id = $2;`,
      [slotId, trainerId]
    );

    revalidatePath("/admin/slots");
    redirect("/admin/slots");
  }

  async function cleanupDuplicateSlots() {
    "use server";

    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) redirect("/login?next=/admin/slots");

    const trainerRes = await pool.query(
      `select id from public.trainers where user_id = $1 and is_active = true limit 1;`,
      [user.id]
    );
    if (trainerRes.rowCount === 0) throw new Error("Treeneri profiili ei leitud");
    const trainerId = trainerRes.rows[0].id as string;

    await pool.query(
      `with ranked as (
         select id,
                row_number() over (
                  partition by trainer_id, start_at, end_at
                  order by created_at asc, id asc
                ) as rn
         from public.availability_slots
         where trainer_id = $1
       )
       delete from public.availability_slots s
       using ranked r
       where s.id = r.id
         and r.rn > 1;`,
      [trainerId]
    );

    revalidatePath("/admin/slots");
    redirect("/admin/slots?cleaned=1");
  }

  async function createSlot(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      redirect("/login?next=/admin/slots");
    }

    const startDay = String(formData.get("start_day") ?? "").trim();
    const startMonth = String(formData.get("start_month") ?? "").trim();
    const startYear = String(formData.get("start_year") ?? "").trim();
    const startTime = String(formData.get("start_time") ?? "").trim();

    const endTime = String(formData.get("end_time") ?? "").trim();

    if (!startDay || !startMonth || !startYear || !startTime || !endTime) {
      throw new Error("Algus ja lõpp on kohustuslikud");
    }

    assertValidDateParts(startDay, startMonth, startYear, "Algus");
    

    const pad2 = (v: string) => v.padStart(2, "0");
    const startDate = `${startYear}-${pad2(startMonth)}-${pad2(startDay)}`;
    const endDate = startDate;

    const isHalfHour = (t: string) => {
      const m = t.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
      if (!m) return false;
      const minutes = Number(m[2]);
      return minutes === 0 || minutes === 30;
    };

    if (!isHalfHour(startTime) || !isHalfHour(endTime)) {
      throw new Error("Aeg peab olema 30-minuti sammuga (00/30)");
    }

    const inWorkingHours = (t: string) => {
      const m = t.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
      if (!m) return false;
      const hh = Number(m[1]);
      const mm = Number(m[2]);
      const minutes = hh * 60 + mm;
      return minutes >= 8 * 60 && minutes <= 21 * 60;
    };

    if (!inWorkingHours(startTime) || !inWorkingHours(endTime)) {
      throw new Error("Aeg peab jääma vahemikku 08:00–21:00");
    }

    const startAt = tallinnLocalToUtcIso(startDate, startTime);
    const endAt = tallinnLocalToUtcIso(endDate, endTime);

    if (new Date(endAt) <= new Date(startAt)) {
      throw new Error("Lõpp peab olema hilisem kui algus");
    }

    const trainerRes = await pool.query(
      `select id from public.trainers
       where user_id = $1 and is_active = true
       limit 1`,
      [user.id]
    );

    if (trainerRes.rowCount === 0) {
      throw new Error("Treeneri profiili ei leitud");
    }

    const trainerId = trainerRes.rows[0].id as string;

    await pool.query(
      `insert into public.availability_slots (trainer_id, start_at, end_at)
       values ($1, $2, $3)`,
      [trainerId, startAt, endAt]
    );

    revalidatePath("/admin/slots");
    redirect("/admin/slots?saved=1");
  }

  const res = await pool.query(
    `select id, start_at, end_at, is_active
     from public.availability_slots
     where trainer_id = $1
     order by start_at asc
     limit 50;`,
    [trainer.id]
  );

  const slots = res.rows;

  const timeOptions = Array.from({ length: (21 - 8) * 2 + 1 }, (_, i) => {
    const totalMinutes = 8 * 60 + i * 30;
    const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const m = String(totalMinutes % 60).padStart(2, "0");
    return `${h}:${m}`;
  });

  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  
  const defaultStartTime = "09:00";
  const endTimeOptions = timeOptions.filter((t) => timeToMinutes(t) > timeToMinutes(defaultStartTime));

  const now = new Date();
  const defaultDay = String(now.getDate()).padStart(2, "0");
  const defaultMonth = String(now.getMonth() + 1).padStart(2, "0");
  const defaultYear = String(now.getFullYear());

  const dayOptions = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  const monthOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const yearOptions = Array.from({ length: 4 }, (_, i) => String(now.getFullYear() + i));

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Vabad ajad</h1>
        <Link href="/admin" className="rounded-xl border px-4 py-2 text-sm font-medium">
          ← Admin
        </Link>
      </div>

      <p className="mt-2 text-gray-700">
        Sisselogitud: <span className="font-medium">{data.user?.email}</span>
      </p>

      {params.saved === "1" && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Vaba aeg salvestatud.
        </div>
      )}
      {params.cleaned === "1" && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Duplikaadid eemaldatud.
        </div>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border p-6">
          <h2 className="text-xl font-semibold">Lisa vaba aeg</h2>

          <form action={createSlot} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Algus</label>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <select
                    name="start_day"
                    className="w-20 rounded-xl border px-3 py-2"
                    required
                    defaultValue={defaultDay}
                    aria-label="Alguse päev"
                  >
                    {dayOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-500">.</span>
                  <select
                    name="start_month"
                    className="w-20 rounded-xl border px-3 py-2"
                    required
                    defaultValue={defaultMonth}
                    aria-label="Alguse kuu"
                  >
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-500">.</span>
                  <select
                    name="start_year"
                    className="w-28 rounded-xl border px-3 py-2"
                    required
                    defaultValue={defaultYear}
                    aria-label="Alguse aasta"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <span className="mx-1 text-gray-400">|</span>
                </div>
                <select
                  name="start_time"
                  className="w-32 rounded-xl border px-3 py-2"
                  required
                  defaultValue={defaultStartTime}
                >
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                Märkus: süsteem ei salvesta olematuid kuupäevi (nt 31.02).
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Lõpp</label>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <select
                  name="end_time"
                  className="w-32 rounded-xl border px-3 py-2"
                  required
                  defaultValue={endTimeOptions[0] ?? "10:00"}
                >
                  {endTimeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                Lõpu kuupäev võetakse automaatselt alguse kuupäeva järgi. Lõpp peab olema hilisem kui algus.
              </p>
            </div>

            <button className="mt-2 inline-flex w-fit rounded-xl bg-black px-6 py-3 text-sm font-medium text-white hover:opacity-90">
              Salvesta aeg
            </button>
          </form>
        </div>

        <div className="rounded-2xl border p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Olemasolevad ajad</h2>
            <form action={cleanupDuplicateSlots}>
              <button
                className="rounded-xl border px-3 py-2 text-xs font-medium hover:bg-neutral-50"
                title="Eemaldab duplikaadid (sama algus/lõpp)"
                type="submit"
              >
                Eemalda duplikaadid
              </button>
            </form>
          </div>

          <div className="mt-4 space-y-3">
            {slots.map((s: any) => (
              <div
                key={s.id}
                className="flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="text-sm">
                  <div className="font-medium">
                    {formatEtDateTime(s.start_at)} – {formatEtDateTime(s.end_at)}
                  </div>
                  <div className="text-gray-600">
                    {s.is_active ? "Aktiivne" : "Mitteaktiivne"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <form action={toggleSlotActive}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="is_active" value={s.is_active ? "false" : "true"} />
                    <button
                      type="submit"
                      className="rounded-xl border px-3 py-2 text-xs font-medium hover:bg-neutral-50"
                      title={s.is_active ? "Muuda mitteaktiivseks" : "Muuda aktiivseks"}
                    >
                      {s.is_active ? "Peida" : "Aktiveeri"}
                    </button>
                  </form>

                  <form action={deleteSlot}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="rounded-xl border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                      title="Kustuta aeg"
                    >
                      Kustuta
                    </button>
                  </form>
                </div>
              </div>
            ))}

            {slots.length === 0 && (
              <div className="text-sm text-gray-600">Vabu aegu pole veel lisatud.</div>
            )}
          </div>
          </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              const startSelect = document.querySelector('select[name="start_time"]');
              const endSelect = document.querySelector('select[name="end_time"]');
              if (!startSelect || !endSelect) return;

              const allTimes = ${JSON.stringify(timeOptions)};

              function toMinutes(t) {
                const [h, m] = t.split(':').map(Number);
                return h * 60 + m;
              }

              function refreshEndOptions() {
                const currentStart = startSelect.value;
                const currentEnd = endSelect.value;
                const filtered = allTimes.filter((t) => toMinutes(t) > toMinutes(currentStart));

                endSelect.innerHTML = '';
                filtered.forEach((t) => {
                  const option = document.createElement('option');
                  option.value = t;
                  option.textContent = t;
                  endSelect.appendChild(option);
                });

                if (filtered.includes(currentEnd)) {
                  endSelect.value = currentEnd;
                } else if (filtered.length > 0) {
                  endSelect.value = filtered[0];
                }
              }

              startSelect.addEventListener('change', refreshEndOptions);
              refreshEndOptions();
            })();
          `,
        }}
      />
    </div>
  );
}