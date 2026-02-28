// lib/email.ts
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
  
  export async function sendEmail(args: SendEmailArgs) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("sendEmail: RESEND_API_KEY missing; skipping", {
        to: args.to,
        subject: args.subject,
      });
      return { skipped: true };
    }
  
    const from = args.from ?? process.env.EMAIL_FROM ?? "Ponimetsa Tall <onboarding@resend.dev>";
  
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
  
  export function formatEtRange(start?: Date | null, end?: Date | null) {
    if (!start) return "";
    const d = start.toLocaleDateString("et-EE");
    const t1 = start.toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" });
    if (!end) return `${d} ${t1}`;
    const t2 = end.toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" });
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
  
  export function tplCustomerReceived(p: {
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
    </div>`;
    const text = `Aitäh, ${p.customerName}!\nSaime sinu broneeringu kätte.\nTeenus: ${p.serviceTitle}${when ? `\nAeg: ${when}` : ""}\n\nSee on broneeringu teade. Kinnitame broneeringu tavaliselt 2 tunni jooksul.`;
    return { subject, html, text };
  }
  
  export function tplTrainerNewBooking(p: {
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
      <p style="margin:12px 0 0 0;">Kinnita/tühista adminis: <a href="${adminUrl}">${adminUrl}</a></p>
    </div>`;
    const text = `Uus broneering\nTeenus: ${p.serviceTitle}${when ? `\nAeg: ${when}` : ""}\nKlient: ${p.customerName}${p.phone ? `\nTelefon: ${p.phone}` : ""}${p.email ? `\nE-post: ${p.email}` : ""}${p.notes ? `\n\nLisainfo:\n${p.notes}` : ""}\n\nAdmin: ${adminUrl}`;
    return { subject, html, text };
  }
  
  export function tplCustomerConfirmed(p: {
    customerName: string;
    serviceTitle: string;
    start?: Date | null;
    end?: Date | null;
  }) {
    const when = formatEtRange(p.start ?? null, p.end ?? null);
    const phone = process.env.CONTACT_PHONE ?? "";
    const email = process.env.CONTACT_EMAIL ?? "";
    const subject = "Broneering kinnitatud";
    const html = `
    <div style="font-family:system-ui,-apple-system;line-height:1.5;color:#111">
      <h2 style="margin:0 0 12px 0;">Broneering kinnitatud ✅</h2>
      <p style="margin:0 0 10px 0;">Tere, ${esc(p.customerName)}! Sinu broneering on kinnitatud.</p>
      <div style="padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa">
        <div><strong>Teenus:</strong> ${esc(p.serviceTitle)}</div>
        ${when ? `<div style="margin-top:6px;"><strong>Aeg:</strong> ${esc(when)}</div>` : ""}
      </div>
      <p style="margin:12px 0 0 0;color:#374151;font-size:14px">
        Kui sul on küsimusi või sa ei saa siiski tulla, võta ühendust:
      </p>
      <p style="margin:8px 0 0 0;color:#374151;font-size:14px">
        ${phone ? `Telefon: ${esc(phone)}<br/>` : ""}${email ? `E-post: ${esc(email)}` : ""}
      </p>
    </div>`;
    const text = `Broneering kinnitatud\nTere, ${p.customerName}! Sinu broneering on kinnitatud.\nTeenus: ${p.serviceTitle}${when ? `\nAeg: ${when}` : ""}\n\nKui sul on küsimusi või sa ei saa tulla: ${phone ? `\nTelefon: ${phone}` : ""}${email ? `\nE-post: ${email}` : ""}`;
    return { subject, html, text };
  }