import Link from "next/link";
import { createClient } from "../../../lib/supabase/server";
import { pool } from "../../../lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../lib/admin";



// --- Email helpers (Resend) ---
type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

function asArray(v: string | string[]) {
  return Array.isArray(v) ? v : [v];
}

function esc(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendEmail(args: SendEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY missing; skipping", args.subject);
    return;
  }

  const from =
    process.env.EMAIL_FROM ?? "Ponimetsa Tall <onboarding@resend.dev>";

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
    console.error("[email] send failed", res.status, body);
  }
}

function fmtEtRange(start?: Date | null, end?: Date | null) {
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

export default async function AdminBookingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  await requireAdmin("/admin/bookings");

  let bookings: any[] = [];

  // Prefer showing booked time (bookings.start_at/end_at). If slot is linked, we still join to show the availability window.
  try {
    const res = await pool.query(`
      select
        b.id,
        b.created_at,
        b.status,
        b.kind,
        s.slug as service_slug,
        s.title as service_title,
        b.customer_name,
        b.customer_phone,
        b.customer_email,
        b.notes,
        b.slot_id,
        b.start_at as booking_start_at,
        b.end_at as booking_end_at,
        a.start_at as slot_start_at,
        a.end_at as slot_end_at
      from public.bookings b
      left join public.services s on s.id = b.service_id
      left join public.availability_slots a on a.id = b.slot_id
      order by b.created_at desc
      limit 50;
    `);
    bookings = res.rows;
  } catch (err) {
    console.warn(
      "AdminBookingsPage: slot join failed (likely bookings.slot_id missing). Falling back without slot fields.",
      err
    );
    const res = await pool.query(`
      select
        b.id,
        b.created_at,
        b.status,
        b.kind,
        s.slug as service_slug,
        s.title as service_title,
        b.customer_name,
        b.customer_phone,
        b.customer_email,
        b.notes,
        b.start_at as booking_start_at,
        b.end_at as booking_end_at
      from public.bookings b
      left join public.services s on s.id = b.service_id
      order by b.created_at desc
      limit 50;
    `);
    bookings = res.rows;
  }

  async function setStatus(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "");
    const status = String(formData.get("status") ?? "");

    if (!id) throw new Error("Missing booking id");
    if (!["pending", "confirmed", "cancelled", "completed"].includes(status)) {
      throw new Error("Invalid status");
    }

    await pool.query(
      `update public.bookings
       set status = $1
       where id = $2`,
      [status, id]
    );

    // Send email based on new status (non-blocking). IMPORTANT: before redirect().
    try {
      const details = await pool.query(
        `select b.customer_name, b.customer_email, b.start_at, b.end_at, b.kind, s.slug as service_slug, s.title as service_title
         from public.bookings b
         left join public.services s on s.id = b.service_id
         where b.id = $1
         limit 1;`,
        [id]
      );

      if ((details.rowCount ?? 0) === 1) {
        const row = details.rows[0] as any;
        const to = String(row.customer_email ?? "").trim();
        const isInquiry =
          row.kind === "inquiry" ||
          row.service_slug === "muu" ||
          (!row.start_at && !row.end_at);
        if (!isInquiry && to) {
          const start = row.start_at ? new Date(row.start_at) : null;
          const end = row.end_at ? new Date(row.end_at) : null;
          const when = fmtEtRange(start, end);

          if (status === "confirmed") {
            console.log("[email] sending CONFIRMED to", to, "booking", id);
            await sendEmail({
              to,
              subject: "Broneering kinnitatud",
              html: `<div style=\"font-family:system-ui;line-height:1.5;color:#111\">
                      <h2 style=\"margin:0 0 10px 0\">Broneering on kinnitatud</h2>
                      <p style=\"margin:0 0 8px 0\">Tere, ${esc(row.customer_name)}!</p>
                      <p style=\"margin:0 0 6px 0\"><strong>Teenus:</strong> ${esc(row.service_title ?? "")}</p>
                      ${when ? `<p style=\"margin:0 0 6px 0\"><strong>Aeg:</strong> ${esc(when)}</p>` : ""}
                      <p style=\"margin:12px 0 0 0\">Kui sul tekib küsimusi või sa ei saa tulla, anna palun teada.</p>
                    </div>`,
              replyTo: process.env.CONTACT_EMAIL,
            });
          }

          if (status === "cancelled") {
            console.log("[email] sending CANCELLED to", to, "booking", id);
            await sendEmail({
              to,
              subject: "Broneering tühistatud",
              html: `<div style=\"font-family:system-ui;line-height:1.5;color:#111\">
                      <h2 style=\"margin:0 0 10px 0\">Broneering tühistatud</h2>
                      <p style=\"margin:0 0 8px 0\">Tere, ${esc(row.customer_name)}!</p>
                      <p style=\"margin:0 0 6px 0\"><strong>Teenus:</strong> ${esc(row.service_title ?? "")}</p>
                      ${when ? `<p style=\"margin:0 0 6px 0\"><strong>Aeg:</strong> ${esc(when)}</p>` : ""}
                      <p style=\"margin:12px 0 0 0\">Palun vali uus aeg või võta meiega ühendust.</p>
                    </div>`,
              replyTo: process.env.CONTACT_EMAIL,
            });
          }
        } else {
          console.log("[email] skipped (no customer_email)", { id, status });
        }
      }
    } catch (e) {
      console.error("[email] error (non-blocking)", e);
    }

    revalidatePath("/admin/bookings");
    redirect("/admin/bookings");
  }

  async function deleteBooking(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "").trim();
    if (!id) throw new Error("Missing booking id");

    // Require auth
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/login?next=/admin/bookings");

    // Re-check rules on server: only delete cancelled/confirmed AND in the past.
    const check = await pool.query(
      `select status, start_at, end_at
       from public.bookings
       where id = $1
       limit 1;`,
      [id]
    );

    if ((check.rowCount ?? 0) !== 1) throw new Error("Booking not found");

    const row = check.rows[0] as any;
const status = String(row.status ?? "");
if (status !== "cancelled" && status !== "confirmed") {
  throw new Error("Delete is allowed only for cancelled or confirmed bookings");
}

// CANCELLED bookings can be deleted immediately.
// CONFIRMED bookings can be deleted only after the time is in the past.
if (status === "confirmed") {
  const end = row.end_at ? new Date(row.end_at) : null;
  const start = row.start_at ? new Date(row.start_at) : null;
  const effectiveEnd = end ?? start; // fallback if end_at missing
  if (!effectiveEnd) {
    throw new Error("Booking time is missing");
  }

  if (effectiveEnd.getTime() > Date.now()) {
    throw new Error("Cannot delete a confirmed booking that has not yet happened");
  }
}

    await pool.query(`delete from public.bookings where id = $1;`, [id]);

    revalidatePath("/admin/bookings");
    redirect("/admin/bookings");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Broneeringud</h1>
        <Link
          href="/admin"
          className="rounded-xl border px-4 py-2 text-sm font-medium"
        >
          ← Admin
        </Link>
      </div>

      <p className="mt-2 text-gray-700">
        Sisselogitud: <span className="font-medium">{data.user?.email}</span>
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50">
            <tr className="text-gray-700">
              <th className="px-4 py-3">Saadetud</th>
              <th className="px-4 py-3">Teenus</th>
              <th className="px-4 py-3">Treeningu aeg</th>
              <th className="px-4 py-3">Klient</th>
              <th className="px-4 py-3">Kontakt</th>
              <th className="px-4 py-3">Lisainfo</th>
              <th className="px-4 py-3">Staatus</th>
              <th className="px-4 py-3">Tegevused</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b: any) => {
              const start = b.booking_start_at ?? b.slot_start_at ?? null;
              const end = b.booking_end_at ?? b.slot_end_at ?? null;

              return (
                <tr key={b.id} className="border-t">
                  <td className="px-4 py-3 text-gray-700">
                    {new Date(b.created_at).toLocaleString("et-EE")}
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {b.service_title ?? b.service_slug ?? "-"}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-gray-700">
                    {start ? (
                      <div>
                        <div className="font-medium text-gray-900">
                          {new Date(start).toLocaleDateString("et-EE")}
                        </div>
                        <div className="text-gray-600">
                          {new Date(start).toLocaleTimeString("et-EE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {end
                            ? ` – ${new Date(end).toLocaleTimeString("et-EE", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`
                            : ""}
                        </div>

                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {b.customer_name}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-gray-700">
                    <div>{b.customer_phone ?? "-"}</div>
                    <div className="text-gray-600">{b.customer_email ?? "-"}</div>
                  </td>

                  <td className="px-4 py-3 text-gray-700">
                    {b.notes ? (
                      <div className="max-w-[320px] whitespace-pre-wrap break-words text-sm">
                        {b.notes}
                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded-lg border px-2 py-1 text-xs font-medium">
                      {b.status}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {(() => {
                      const canConfirm = b.status === "pending";
                      const canCancel =
                        b.status === "pending" || b.status === "confirmed";

                      const start = b.booking_start_at ?? b.slot_start_at ?? null;
                      const end = b.booking_end_at ?? b.slot_end_at ?? null;
                      const effectiveEnd = end ?? start;
                      const isPast = effectiveEnd
                        ? new Date(effectiveEnd).getTime() < Date.now()
                        : false;
                    const canDelete =
                        b.status === "cancelled" ||
                        (b.status === "confirmed" && isPast);

                      return (
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={setStatus}>
                            <input type="hidden" name="id" value={b.id} />
                            <input type="hidden" name="status" value="confirmed" />
                            <button
                              type="submit"
                              disabled={!canConfirm}
                              className={`rounded-lg border px-2 py-1 text-xs ${
                                canConfirm
                                  ? "hover:bg-neutral-50"
                                  : "opacity-50 cursor-not-allowed"
                              }`}
                              title={
                                canConfirm
                                  ? "Kinnita broneering"
                                  : "Ei saa kinnitada"
                              }
                            >
                              Kinnita
                            </button>
                          </form>

                          <form action={setStatus}>
                            <input type="hidden" name="id" value={b.id} />
                            <input type="hidden" name="status" value="cancelled" />
                            <button
                              type="submit"
                              disabled={!canCancel}
                              className={`rounded-lg border px-2 py-1 text-xs ${
                                canCancel
                                  ? "hover:bg-neutral-50"
                                  : "opacity-50 cursor-not-allowed"
                              }`}
                              title={
                                canCancel
                                  ? "Tühista broneering"
                                  : "Ei saa tühistada"
                              }
                            >
                              Tühista
                            </button>
                          </form>

                          <form action={deleteBooking} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={b.id} />

                        <label className="flex items-center gap-1 text-xs text-gray-600">
                            <input
                            type="checkbox"
                            name="confirm_delete"
                            required
                            disabled={!canDelete}
                            />
                            kinnitan
                        </label>

                        <button
                            type="submit"
                            disabled={!canDelete}
                            className={`rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 ${
                            canDelete ? "hover:bg-red-50" : "opacity-50 cursor-not-allowed"
                            }`}
                            title={
                            canDelete
                                ? "Kustuta broneering (tühistatud: kohe; kinnitatud: pärast toimumist)"
                                : "Kustutada saab: tühistatud broneering kohe; kinnitatud broneering alles siis, kui aeg on möödas"
                            }
                        >
                            Kustuta
                        </button>
                        </form>
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}

            {bookings.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-gray-600" colSpan={8}>
                  Broneeringuid ei ole veel.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}