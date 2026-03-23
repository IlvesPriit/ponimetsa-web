import Link from "next/link";
import Script from "next/script";
import { pool } from "@/lib/db";
import { redirect } from "next/navigation";
import ServicePicker from "./ServicePicker";
import BookingCalendar from "./BookingCalendar";

type PageProps = {
  searchParams?: Promise<{ service?: string; kind?: string; error?: string }>;
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


async function verifyTurnstileToken(token: string) {
  const secret =
    process.env.TURNSTILE_SECRET_KEY_BOOKING ??
    process.env.TURNSTILE_SECRET_KEY ??
    "";

  if (!secret) {
    console.warn("Turnstile secret missing; skipping verification");
    return true;
  }

  if (!token) {
    return false;
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Turnstile verify failed with HTTP", res.status);
    return false;
  }

  const json = (await res.json()) as { success?: boolean };
  return Boolean(json.success);
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

function emailShell(title: string, bodyHtml: string) {
  const logoUrl = `${getBaseUrl()}/images/logo.png`;
  return `
  <div style="margin:0;padding:24px;background:#f5f5f4;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,0.05);">
      <div style="padding:20px 24px;border-bottom:1px solid #e5e7eb;background:#ffffff;display:flex;align-items:center;gap:14px;">
        <img src="${logoUrl}" alt="Ponimetsa Tall" width="48" height="48" style="display:block;border-radius:10px;border:1px solid #e5e7eb;background:#fff;" />
        <div>
          <div style="font-size:20px;font-weight:700;line-height:1.2;color:#111827;">Ponimetsa Tall</div>
          <div style="margin-top:2px;font-size:13px;line-height:1.4;color:#6b7280;">Ratsatrennid, ponisõit ja hobuteenused Pärnumaal</div>
        </div>
      </div>
      <div style="padding:24px;">
        <h1 style="margin:0 0 16px 0;font-size:26px;line-height:1.2;color:#111827;">${title}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:16px 24px;border-top:1px solid #e5e7eb;background:#fafaf9;font-size:13px;line-height:1.6;color:#6b7280;">
        <div><strong style="color:#111827;">Ponimetsa Tall</strong></div>
        <div>Reiu küla, Pärnumaa</div>
        <div>Telefon: <a href="tel:+37256968282" style="color:#111827;text-decoration:none;">+372 5696 8282</a></div>
        <div>E-post: <a href="mailto:info@ponimetsa.ee" style="color:#111827;text-decoration:none;">info@ponimetsa.ee</a></div>
      </div>
    </div>
  </div>`;
}

function tplCustomerReceived(p: {
  customerName: string;
  serviceTitle: string;
  start?: Date | null;
  end?: Date | null;
}) {
  const when = formatEtRange(p.start ?? null, p.end ?? null);
  const subject = "Broneering kätte saadud (kinnitame peagi)";

  const html = emailShell(
    `Aitäh, ${esc(p.customerName)}!`,
    `
    <p style="margin:0 0 12px 0;font-size:16px;line-height:1.6;color:#111827;">Saime sinu broneeringu kätte.</p>
    <div style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:14px;background:#fafaf9;">
      <div style="font-size:15px;line-height:1.6;"><strong>Teenus:</strong> ${esc(p.serviceTitle)}</div>
      ${when ? `<div style="margin-top:6px;font-size:15px;line-height:1.6;"><strong>Aeg:</strong> ${esc(when)}</div>` : ""}
    </div>
    <p style="margin:16px 0 0 0;font-size:15px;line-height:1.7;color:#111827;">See e-kiri on <strong>broneeringu teade</strong>. Kinnitame broneeringu esimesel võimalusel.</p>
    <p style="margin:12px 0 0 0;font-size:14px;line-height:1.7;color:#4b5563;">Kui tekib küsimusi, vasta sellele kirjale või võta meiega otse ühendust.</p>
    `
  );

  const text =
    `Aitäh, ${p.customerName}!\n\n` +
    `Saime sinu broneeringu kätte.\n` +
    `Teenus: ${p.serviceTitle}` +
    (when ? `\nAeg: ${when}` : "") +
    `\n\nSee on broneeringu teade. Kinnitame broneeringu tavaliselt samal päeval.`;

  return { subject, html, text };
}

function tplCustomerInquiryReceived(p: {
  customerName: string;
  serviceTitle: string;
  notes?: string | null;
}) {
  const subject = "Päring on kätte saadud";

  const html = emailShell(
    `Aitäh, ${esc(p.customerName)}!`,
    `
    <p style="margin:0 0 12px 0;font-size:16px;line-height:1.6;color:#111827;">Saime sinu päringu kätte.</p>
    <div style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:14px;background:#fafaf9;">
      <div style="font-size:15px;line-height:1.6;"><strong>Teema:</strong> ${esc(p.serviceTitle)}</div>
      ${p.notes ? `<div style="margin-top:8px;font-size:15px;line-height:1.7;"><strong>Sinu sõnum:</strong><br/>${esc(p.notes).replace(/\n/g, "<br/>")}</div>` : ""}
    </div>
    <p style="margin:16px 0 0 0;font-size:15px;line-height:1.7;color:#111827;">Võtame teiega lähiajal ühendust, et detailid kokku leppida.</p>
    <p style="margin:12px 0 0 0;font-size:14px;line-height:1.7;color:#4b5563;">Kui soovid midagi lisada, vasta sellele kirjale või võta meiega otse ühendust.</p>
    `
  );

  const text =
    `Aitäh, ${p.customerName}!\n\n` +
    `Saime sinu päringu kätte.\n` +
    `Teema: ${p.serviceTitle}` +
    (p.notes ? `\nSinu sõnum:\n${p.notes}` : "") +
    `\n\nVõtame teiega lähiajal ühendust, et detailid kokku leppida.`;

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

function tplTrainerNewInquiry(p: {
  serviceTitle: string;
  customerName: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}) {
  const adminUrl = `${getBaseUrl()}/admin/bookings`;
  const subject = "Uus päring veebilehelt";

  const html = emailShell(
    "Uus päring veebilehelt",
    `
    <p style="margin:0 0 12px 0;font-size:16px;line-height:1.6;color:#111827;">Veebilehelt saabus uus päring.</p>
    <div style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:14px;background:#fafaf9;">
      <div style="font-size:15px;line-height:1.6;"><strong>Teema:</strong> ${esc(p.serviceTitle)}</div>
      <div style="margin-top:6px;font-size:15px;line-height:1.6;"><strong>Nimi:</strong> ${esc(p.customerName)}</div>
      ${p.phone ? `<div style="margin-top:6px;font-size:15px;line-height:1.6;"><strong>Telefon:</strong> <a href="tel:${esc(p.phone)}" style="color:#111827;text-decoration:none;">${esc(p.phone)}</a></div>` : ""}
      ${p.email ? `<div style="margin-top:6px;font-size:15px;line-height:1.6;"><strong>E-post:</strong> <a href="mailto:${esc(p.email)}" style="color:#111827;text-decoration:none;">${esc(p.email)}</a></div>` : ""}
      ${p.notes ? `<div style="margin-top:10px;font-size:15px;line-height:1.7;"><strong>Päringu sisu:</strong><br/>${esc(p.notes).replace(/\n/g, "<br/>")}</div>` : ""}
    </div>
    <p style="margin:16px 0 0 0;font-size:14px;line-height:1.7;color:#4b5563;">Vaata ja halda kirjet adminis: <a href="${adminUrl}" style="color:#111827;">${adminUrl}</a></p>
    `
  );

  const text =
    `Uus päring veebilehelt\n\n` +
    `Teema: ${p.serviceTitle}\n` +
    `Nimi: ${p.customerName}` +
    (p.phone ? `\nTelefon: ${p.phone}` : "") +
    (p.email ? `\nE-post: ${p.email}` : "") +
    (p.notes ? `\n\nPäringu sisu:\n${p.notes}` : "") +
    `\n\nAdmin: ${adminUrl}`;

  return { subject, html, text };
}

// ---------------- /Email helpers ----------------

export default async function BookingPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const rawServiceSlug = params.service ?? "";
  const requestedKind = params.kind ?? "";
  const requestedError = params.error ?? "";

  const normalizedServiceSlug =
    rawServiceSlug === "ratsatrenn" ? "eratrenn" : rawServiceSlug;

  const serviceSlug =
    !normalizedServiceSlug && requestedKind === "inquiry"
      ? "muu"
      : normalizedServiceSlug;

  const serviceSelected = SERVICES.some((s) => s.slug === serviceSlug);
  const service = SERVICES.find((s) => s.slug === serviceSlug) ?? SERVICES[0];
  const isInquiryMode = requestedKind === "inquiry" || service.slug === "muu";
  const turnstileSiteKey =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY_BOOKING ??
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ??
  "";

  const errorMessage =
    requestedError === "turnstile"
      ? "Robotikontroll ebaõnnestus või jäi tegemata. Palun proovi uuesti ning kinnita, et sa ei ole robot."
      : requestedError === "unknown"
        ? "Midagi läks saatmisel valesti. Palun proovi uuesti."
        : "";

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
    const backParams = new URLSearchParams();
    backParams.set("service", svc);
    if (svc === "muu") {
      backParams.set("kind", "inquiry");
    }
    const turnstileToken = String(formData.get("cf-turnstile-response") ?? "").trim();
    const turnstileOk = await verifyTurnstileToken(turnstileToken);

    if (!turnstileOk) {
      backParams.set("error", "turnstile");
      redirect(`/booking?${backParams.toString()}`);
    }

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
        const tpl = svcDef.bookable
          ? tplCustomerReceived({
              customerName: name,
              serviceTitle,
              start,
              end,
            })
          : tplCustomerInquiryReceived({
              customerName: name,
              serviceTitle,
              notes: notes || null,
            });

        await sendEmail({
          to: email,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          replyTo: process.env.CONTACT_EMAIL,
        });
      }

      const trainerEmails = Array.from(
        new Set(
          [
            ...(process.env.TRAINER_EMAILS ?? "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            process.env.CONTACT_EMAIL?.trim() ?? "",
          ].filter(Boolean)
        )
      );

      if (trainerEmails.length > 0) {
        const tpl = svcDef.bookable
          ? tplTrainerNewBooking({
              serviceTitle,
              customerName: name,
              phone: phone || null,
              email: email || null,
              notes: notes || null,
              start,
              end,
            })
          : tplTrainerNewInquiry({
              serviceTitle,
              customerName: name,
              phone: phone || null,
              email: email || null,
              notes: notes || null,
            });

        await sendEmail({
          to: trainerEmails,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          replyTo: email || process.env.CONTACT_EMAIL,
        });
      }
    } catch (e) {
      console.error("Email send failed (non-blocking)", e);
    }
    // --- /Email notifications ---

    redirect(svcDef.bookable ? "/booking/success" : "/booking/success?type=inquiry");
  }

  return (
    <div className="mx-auto max-w-2xl bg-white px-4 py-16 text-gray-900">
      {turnstileSiteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
        />
      )}
  
      {(isInquiryMode || serviceSelected) && (
        <div className="mb-4">
          <Link
            href="/booking"
            className="inline-flex items-center text-sm text-gray-600 hover:text-black hover:underline"
          >
            ← Muuda teenust
          </Link>
        </div>
      )}
  
      <h1 className="text-3xl font-semibold">
        {isInquiryMode ? "Saada päring" : "Broneerimine"}
      </h1>
      <p className="mt-2 text-gray-700">
        {isInquiryMode
          ? "Kirjelda oma soovi ja võtame sinuga ühendust, et aeg ning detailid kokku leppida."
          : "Ponijalutus ja eratrenn on broneeritavad vabade aegade alusel. Kõik muu saab kokku leppida päringu kaudu."}
      </p>

      {errorMessage && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-medium">Saatmine ei õnnestunud.</div>
          <div className="mt-1">{errorMessage}</div>
          <div className="mt-3">
            <Link
              href={isInquiryMode ? "/booking?kind=inquiry" : serviceSelected ? `/booking?service=${service.slug}` : "/booking"}
              className="inline-flex items-center text-sm font-medium text-red-800 underline underline-offset-2"
            >
              Proovi uuesti
            </Link>
          </div>
        </div>
      )}

      {!isInquiryMode && (
        <div className="mt-8 rounded-2xl border bg-white p-4">
          <ServicePicker
            services={SERVICES.map(({ slug, title }) => ({ slug, title }))}
            value={serviceSelected ? serviceSlug : ""}
          />
          {serviceSelected && service.description && (
            <p className="mt-2 text-xs text-gray-600">{service.description}</p>
          )}
        </div>
      )}

      {!serviceSelected && !isInquiryMode && (
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
          ) : null
          }

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
              <input name="email" type="email" className="mt-1 w-full rounded-xl border px-4 py-3" placeholder="" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Soov / lisainfo</label>
            <textarea
              name="notes"
              className="mt-1 w-full rounded-xl border px-4 py-3"
              rows={5}
              placeholder=""
            />
          </div>

          {turnstileSiteKey && (
            <div className="rounded-2xl border bg-white p-4">
              <div className="mb-2 text-sm text-gray-700">
                Palun kinnita enne saatmist.
              </div>
              <div id="turnstile-booking-widget" data-turnstile-ready="0" />
              <script
                dangerouslySetInnerHTML={{
                  __html: `
                    (function () {
                      const siteKey = ${JSON.stringify(turnstileSiteKey)};
                      const widgetId = "turnstile-booking-widget";

                      function clearWidget() {
                        const el = document.getElementById(widgetId);
                        if (!el) return null;
                        el.innerHTML = "";
                        el.removeAttribute("data-rendered");
                        el.setAttribute("data-turnstile-ready", "0");
                        return el;
                      }

                      function mountTurnstile() {
                        const el = document.getElementById(widgetId);
                        if (!el) return false;

                        if (window.turnstile && typeof window.turnstile.render === "function") {
                          if (el.getAttribute("data-rendered") === "1") {
                            return true;
                          }

                          el.innerHTML = "";
                          window.turnstile.render("#" + widgetId, {
                            sitekey: siteKey,
                            theme: "light",
                          });
                          el.setAttribute("data-rendered", "1");
                          el.setAttribute("data-turnstile-ready", "1");
                          return true;
                        }

                        return false;
                      }

                      clearWidget();

                      let tries = 0;
                      const timer = setInterval(function () {
                        const done = mountTurnstile();
                        tries += 1;
                        if (done || tries > 40) {
                          clearInterval(timer);
                        }
                      }, 250);

                      mountTurnstile();

                      window.addEventListener("pageshow", function () {
                        clearWidget();
                        let retryCount = 0;
                        const retryTimer = setInterval(function () {
                          const done = mountTurnstile();
                          retryCount += 1;
                          if (done || retryCount > 40) {
                            clearInterval(retryTimer);
                          }
                        }, 250);
                      });
                    })();
                  `,
                }}
              />
            </div>
          )}

          <button className="w-full rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:opacity-90">
            {isInquiryMode ? "Saada päring" : "Saada broneering"}
          </button>

          
        </form>
      )}
    </div>
  );
}