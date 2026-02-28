import Link from "next/link";
import { pool } from "@/lib/db";
import { redirect } from "next/navigation";
import ServicePicker from "./ServicePicker";
import BookingCalendar from "./BookingCalendar";

type PageProps = {
  searchParams?: Promise<{ service?: string }>;
};

type ServiceDef = {
  slug: string;
  title: string;
  durationMinutes: number;
  bookable: boolean;
  description?: string;
};

const SERVICES: ServiceDef[] = [
  {
    slug: "ponijalutus",
    title: "Ponijalutus",
    durationMinutes: 30,
    bookable: true,
    description: "Lühike ponijalutus (kestus 30 min).",
  },
  {
    slug: "eratrenn",
    title: "Eratrenn",
    durationMinutes: 60,
    bookable: true,
    description: "Eratrenn (kestus 1 h).",
  },
  {
    slug: "muu",
    title: "Muu päring / küsimus",
    durationMinutes: 0,
    bookable: false,
    description:
      "Kui soovid midagi muud, kirjuta siia päring ja lepime aja ning detailid kokku.",
  },
];

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}

function fmtEt(d: Date) {
  return d.toLocaleString("et-EE", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------- Email helpers (Resend) ----------------

type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
};

function asArray(v: string | string[]) {
  return Array.isArray(v) ? v : [v];
}

function getBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

async function sendEmail(args: SendEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("sendEmail: RESEND_API_KEY missing; skipping email", {
      to: args.to,
      subject: args.subject,
    });
    return { skipped: true } as const;
  }

  const from =
    args.from ??
    process.env.EMAIL_FROM ??
    "Ponimetsa Tall <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: asArray(args.to),
      subject: args.subject,
      html: args.html,
      text: args.text,
      reply_to: args.replyTo,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Email send failed (${res.status}): ${body}`);
  }

  return res.json();
}

function formatEtRange(start?: Date | null, end?: Date | null) {
  if (!start) return "";
  const d = start.toLocaleDateString("et-EE");
  const t1 = start.toLocaleTimeString("et-EE", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!end) return `${d} ${t1}`;
  const t2 = end.toLocaleTimeString("et-EE", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${d} ${t1}–${t2}`;
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function tplCustomerReceived(p: {
  customerName: string;
  serviceTitle: string;
  start?: Date | null;
  end?: Date | null;
}) {
  const when = formatEtRange(p.start ?? null, p.end ?? null);
  const subject = "Broneering vastu võetud (kinnitame peagi)";

  const html = `
  <div style="font-family:system-ui,-apple-system;line-height:1.5;color:#111">
    <h2 style="margin:0 0 12px 0;">Aitäh, ${esc(p.customerName)}!</h2>
    <p style="margin:0 0 10px 0;">Saime sinu broneeringu kätte.</p>
    <div style="padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa">
      <div><strong>Teenus:</strong> ${esc(p.serviceTitle)}</div>
      ${when ? `<div style="margin-top:6px;"><strong>Aeg:</strong> ${esc(when)}</div>` : ""}
    </div>
    <p style="margin:12px 0 0 0;">
      See e-kiri on <strong>broneeringu teade</strong>. Kinnitame broneeringu esimesel võimalusel (tavaliselt 2 tunni jooksul).
    </p>
    <p style="margin:12px 0 0 0;color:#374151;font-size:14px">Kui tekib küsimusi, vasta sellele kirjale või võta meiega ühendust.</p>
  </div>`;

  const text =
    `Aitäh, ${p.customerName}!\n\n` +
    `Saime sinu broneeringu kätte.\n` +
    `Teenus: ${p.serviceTitle}` +
    (when ? `\nAeg: ${when}` : "") +
    `\n\nSee on broneeringu teade. Kinnitame broneeringu tavaliselt 2 tunni jooksul.`;

  return { subject, html, text };
}

function tplTrainerNewBooking(p: {
  serviceTitle: string;
  customerName: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  start?: Date | null;
  end?: Date | null;
}) {
  const when = formatEtRange(p.start ?? null, p.end ?? null);
  const adminUrl = `${getBaseUrl()}/admin/bookings`;
  const subject = "Uus broneering (vajab kinnitust)";

  const html = `
  <div style="font-family:system-ui,-apple-system;line-height:1.5;color:#111">
    <h2 style="margin:0 0 12px 0;">Uus broneering</h2>
    <div style="padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa">
      <div><strong>Teenus:</strong> ${esc(p.serviceTitle)}</div>
      ${when ? `<div style="margin-top:6px;"><strong>Aeg:</strong> ${esc(when)}</div>` : ""}
      <div style="margin-top:6px;"><strong>Klient:</strong> ${esc(p.customerName)}</div>
      ${p.phone ? `<div style="margin-top:6px;"><strong>Telefon:</strong> ${esc(p.phone)}</div>` : ""}
      ${p.email ? `<div style="margin-top:6px;"><strong>E-post:</strong> ${esc(p.email)}</div>` : ""}
      ${p.notes ? `<div style="margin-top:10px;"><strong>Lisainfo:</strong><br/>${esc(p.notes).replace(/\n/g, "<br/>")}</div>` : ""}
    </div>
    <p style="margin:12px 0 0 0;">Kinnita / tühista adminis: <a href="${adminUrl}">${adminUrl}</a></p>
  </div>`;

  const text =
    `Uus broneering\n\n` +
    `Teenus: ${p.serviceTitle}` +
    (when ? `\nAeg: ${when}` : "") +
    `\nKlient: ${p.customerName}` +
    (p.phone ? `\nTelefon: ${p.phone}` : "") +
    (p.email ? `\nE-post: ${p.email}` : "") +
    (p.notes ? `\n\nLisainfo:\n${p.notes}` : "") +
    `\n\nAdmin: ${adminUrl}`;

  return { subject, html, text };
}

// ---------------- /Email helpers ----------------

export default async function BookingPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const rawServiceSlug = params.service ?? "";
  const serviceSlug = rawServiceSlug === "ratsatrenn" ? "eratrenn" : rawServiceSlug;

  const serviceSelected = SERVICES.some((s) => s.slug === serviceSlug);
  const service = SERVICES.find((s) => s.slug === serviceSlug) ?? SERVICES[0];

  // Detect which optional columns exist in public.bookings so we can write structured data safely.
  const bookingCaps = await (async () => {
    try {
      const cols = await pool.query(
        `select column_name
         from information_schema.columns
         where table_schema='public' and table_name='bookings';`
      );
      const set = new Set<string>(cols.rows.map((r: any) => String(r.column_name)));
      return {
        hasStartAt: set.has("start_at"),
        hasEndAt: set.has("end_at"),
        hasSlotId: set.has("slot_id"),
        hasKind: set.has("kind"),
      };
    } catch {
      return { hasStartAt: false, hasEndAt: false, hasSlotId: false, hasKind: false };
    }
  })();

  const hasStartEnd = bookingCaps.hasStartAt && bookingCaps.hasEndAt;

  async function createBooking(formData: FormData) {
    "use server";

    const svc = String(formData.get("service") ?? "").trim();
    const selectedStart = String(formData.get("start_at") ?? "").trim();

    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!svc) throw new Error("Teenuse valik puudub");
    if (!name) throw new Error("Nimi on kohustuslik");

    const svcDef = SERVICES.find((s) => s.slug === svc);
    if (!svcDef) throw new Error("Tundmatu teenus");

    const svcRes = await pool.query(
      `select id from public.services where slug = $1 and is_active = true limit 1`,
      [svc]
    );
    if ((svcRes.rowCount ?? 0) !== 1) {
      throw new Error(
        "Valitud teenust ei leitud andmebaasist (public.services). Lisa teenus DB-sse või muuda slug'i."
      );
    }
    const serviceId = svcRes.rows[0].id as string;

    let startAt: Date | null = null;
    let endAt: Date | null = null;

    if (svcDef.bookable) {
      if (!selectedStart) throw new Error("Vali broneerimiseks sobiv aeg");
      startAt = new Date(selectedStart);
      if (Number.isNaN(startAt.getTime())) throw new Error("Vigane aeg");
      endAt = addMinutes(startAt, svcDef.durationMinutes);

      const fitRes = await pool.query(
        `select id
         from public.availability_slots
         where is_active = true
           and (service_id = $3 or service_id is null)
           and start_at <= $1
           and end_at >= $2
           and $1 >= (now() + interval '30 minutes')
         order by (service_id = $3) desc, start_at asc
         limit 1;`,
        [startAt.toISOString(), endAt.toISOString(), serviceId]
      );

      if ((fitRes.rowCount ?? 0) === 0) {
        throw new Error("Valitud aeg ei ole enam saadaval. Palun vali uus aeg.");
      }

      if (hasStartEnd) {
        const ovRes = await pool.query(
          `select 1
           from public.bookings
           where status in ('pending','confirmed')
             and start_at < $2
             and end_at > $1
           limit 1;`,
          [startAt.toISOString(), endAt.toISOString()]
        );
        if ((ovRes.rowCount ?? 0) > 0) {
          throw new Error("See aeg on vahepeal juba broneeritud. Palun vali uus aeg.");
        }
      }
    }

    const chosenText =
      svcDef.bookable && startAt && endAt
        ? `Soovitud aeg: ${fmtEt(startAt)} – ${endAt.toLocaleTimeString("et-EE", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          })}\nTeenus: ${svcDef.title}`
        : `Teenus: ${svcDef.title}`;

    if (hasStartEnd && svcDef.bookable && startAt && endAt) {
      const cols: string[] = [
        "service_id",
        "status",
        "customer_name",
        "customer_phone",
        "customer_email",
        "notes",
        "source",
        "start_at",
        "end_at",
      ];
      const vals: any[] = [
        serviceId,
        "pending",
        name,
        phone || null,
        email || null,
        notes || null,
        "website",
        startAt.toISOString(),
        endAt.toISOString(),
      ];

      if (bookingCaps.hasKind) {
        cols.push("kind");
        vals.push("slot");
      }

      const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
      await pool.query(
        `insert into public.bookings (${cols.join(", ")}) values (${placeholders})`,
        vals
      );
    } else {
      const mergedNotes = [chosenText, notes].filter(Boolean).join("\n\n");
      if (bookingCaps.hasKind) {
        await pool.query(
          `insert into public.bookings
            (service_id, status, customer_name, customer_phone, customer_email, notes, source, kind)
           values
            ($1, 'pending', $2, $3, $4, $5, 'website', $6)`,
          [serviceId, name, phone || null, email || null, mergedNotes || null, "inquiry"]
        );
      } else {
        await pool.query(
          `insert into public.bookings
            (service_id, status, customer_name, customer_phone, customer_email, notes, source)
           values
            ($1, 'pending', $2, $3, $4, $5, 'website')`,
          [serviceId, name, phone || null, email || null, mergedNotes || null]
        );
      }
    }

    // --- Email notifications (MVP). Non-blocking: booking is saved even if email fails. ---
    try {
      const serviceTitle = svcDef.title;
      const start = startAt;
      const end = endAt;

      if (email) {
        const tpl = tplCustomerReceived({
          customerName: name,
          serviceTitle,
          start,
          end,
        });

        await sendEmail({
          to: email,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          replyTo: process.env.CONTACT_EMAIL,
        });
      }

      const trainerEmails = (process.env.TRAINER_EMAILS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (trainerEmails.length > 0) {
        const tpl = tplTrainerNewBooking({
          serviceTitle,
          customerName: name,
          phone: phone || null,
          email: email || null,
          notes: notes || null,
          start,
          end,
        });

        await sendEmail({
          to: trainerEmails,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          replyTo: process.env.CONTACT_EMAIL,
        });
      }
    } catch (e) {
      console.error("Email send failed (non-blocking)", e);
    }
    // --- /Email notifications ---

    redirect("/booking/success");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold">Broneerimine</h1>
      <p className="mt-2 text-gray-700">
        Ponijalutus ja eratrenn on broneeritavad vabade aegade alusel. Kõik muu saab kokku leppida päringu kaudu.
      </p>

      <div className="mt-8 rounded-2xl border bg-white p-4">
        <ServicePicker
          services={SERVICES.map(({ slug, title }) => ({ slug, title }))}
          value={serviceSelected ? serviceSlug : ""}
        />
        {serviceSelected && service.description && (
          <p className="mt-2 text-xs text-gray-600">{service.description}</p>
        )}
      </div>

      {!serviceSelected && (
        <p className="mt-4 text-sm text-gray-700">Vali teenus, et näha vabu aegu või saata päring.</p>
      )}

      {serviceSelected && (
        <form action={createBooking} className="mt-6 space-y-5">
          <input type="hidden" name="service" value={service.slug} />

          {service.bookable ? (
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm font-medium text-gray-900">Vali kuupäev ja kellaaeg</div>
              <div className="mt-1 text-xs text-gray-600">
                Näitame ainult aegu, mis algavad vähemalt 30 min tulevikus. Aja samm: 30 min. Kestvus: {service.durationMinutes} min. Nädal algab esmaspäevast.
              </div>
              <div className="mt-4">
                <BookingCalendar serviceSlug={service.slug} inputName="start_at" />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border bg-white p-4 text-sm text-gray-700">
              See teenus ei ole hetkel ajaslotiga broneeritav. Kirjelda oma soovi ja lepime aja kokku.
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Nimi</label>
            <input name="name" className="mt-1 w-full rounded-xl border px-4 py-3" required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Telefon</label>
              <input name="phone" className="mt-1 w-full rounded-xl border px-4 py-3" placeholder="+372…" />
            </div>
            <div>
              <label className="text-sm font-medium">E-post</label>
              <input name="email" type="email" className="mt-1 w-full rounded-xl border px-4 py-3" placeholder="nimi@..." />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Soov / lisainfo</label>
            <textarea name="notes" className="mt-1 w-full rounded-xl border px-4 py-3" rows={5} placeholder="Nt lapse vanus, mitu osalejat, erisoovid…" />
          </div>

          <button className="w-full rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:opacity-90">
            Saada broneering
          </button>

          <div className="text-center text-sm text-gray-600">
            Või kirjuta otse: <Link href="/#contact" className="underline">Kontakt</Link>
          </div>
        </form>
      )}
    </div>
  );
}