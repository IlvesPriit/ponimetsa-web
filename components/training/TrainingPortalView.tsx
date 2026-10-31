import Link from "next/link";
import type { TrainingPortalData } from "@/lib/training-portal";

const WEEKDAYS = ["", "E", "T", "K", "N", "R", "L", "P"];

function dateTime(value: string | Date) {
  return new Intl.DateTimeFormat("et-EE", {
    timeZone: "Europe/Tallinn",
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function dateOnly(value: string | Date) {
  return new Intl.DateTimeFormat("et-EE", {
    timeZone: "Europe/Tallinn",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function bookingStatus(status: string) {
  const labels: Record<string, string> = {
    pending_trainer: "Ootab treeneri kinnitust",
    confirmed: "Kinnitatud",
    attended: "Osaletud",
    no_show: "Ei osalenud",
  };
  return labels[status] ?? status;
}

function waitlistStatus(status: string) {
  return status === "offered" ? "Koht on pakutud" : "Ootenimekirjas";
}

export function TrainingPortalView({ data, preview = false }: { data: TrainingPortalData; preview?: boolean }) {
  const riderById = new Map(data.riders.map((rider) => [rider.id, rider]));
  const availableCredits = data.credits.filter((credit) => credit.state === "available");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {preview && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <strong>Administraatori testvaade.</strong> Näed praegu sama infot, mida näeks {data.perspective === "contact" ? "lapsevanem või kontakt" : "ratsanik"}. Midagi ei saadeta ega muudeta.
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-green-800">Minu trennid</p>
          <h1 className="mt-1 text-3xl font-semibold">Tere, {data.viewerName}</h1>
          {data.viewerEmail && <p className="mt-1 text-sm text-gray-600">{data.viewerEmail}</p>}
        </div>
        {!preview && <Link href="/" className="rounded-xl border px-4 py-2 text-sm font-medium">Ponimetsa avalehele</Link>}
      </div>

      {!data.riders.length ? (
        <div className="mt-8 rounded-2xl border p-6">
          <h2 className="text-lg font-semibold">Ratsanikku ei ole kontoga seotud</h2>
          <p className="mt-2 text-sm text-gray-600">Võta Ponimetsaga ühendust ja anna teada, millise ratsaniku profiil peaks selle e-postiga seotud olema.</p>
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.riders.map((rider) => {
              const memberships = data.memberships.filter((item) => item.rider_id === rider.id);
              return (
                <article key={rider.id} className="rounded-2xl border p-5">
                  <h2 className="text-xl font-semibold">{rider.display_name}</h2>
                  <div className="mt-3 space-y-1 text-sm text-gray-700">
                    <p><span className="font-medium">Tase:</span> {rider.level_label}</p>
                    <p><span className="font-medium">Leping:</span> {rider.weekly_sessions == null ? "vajab täiendamist" : `${rider.weekly_sessions} trenni nädalas`}</p>
                  </div>
                  <div className="mt-4 border-t pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Püsiajad</p>
                    {memberships.length ? memberships.map((item) => (
                      <p key={`${item.group_name}-${item.weekday}-${item.start_time}`} className="mt-1 text-sm">{WEEKDAYS[item.weekday]} {item.start_time} · {item.group_name}</p>
                    )) : <p className="mt-1 text-sm text-gray-500">Kinnitatud püsiaegu ei ole.</p>}
                  </div>
                </article>
              );
            })}
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border bg-green-50 p-5">
              <p className="text-sm text-green-900">Kasutatavaid krediite</p>
              <p className="mt-1 text-3xl font-semibold text-green-950">{availableCredits.length}</p>
            </div>
            <div className="rounded-2xl border p-5">
              <p className="text-sm text-gray-600">Aktiivseid ootenimekirju</p>
              <p className="mt-1 text-3xl font-semibold">{data.waitlist.length}</p>
            </div>
            <div className="rounded-2xl border p-5">
              <p className="text-sm text-gray-600">Tulevasi trenne</p>
              <p className="mt-1 text-3xl font-semibold">{data.bookings.length}</p>
            </div>
          </section>

          <section className="mt-8 rounded-2xl border p-6">
            <h2 className="text-xl font-semibold">Tulevased trennid</h2>
            <div className="mt-4 space-y-3">
              {data.bookings.map((booking) => (
                <article key={booking.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-neutral-50 px-4 py-3">
                  <div>
                    <p className="font-medium">{booking.title || "Ratsutamistreening"}</p>
                    <p className="text-sm text-gray-600">{riderById.get(booking.rider_id)?.display_name} · {dateTime(booking.starts_at)}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{bookingStatus(booking.status)}</p>
                    <p className="text-gray-600">Hobune: {booking.horse_name ?? "avaldatakse enne trenni"}</p>
                  </div>
                </article>
              ))}
              {!data.bookings.length && <p className="text-sm text-gray-500">Tulevasi kalendritrenne ei ole veel lisatud.</p>}
            </div>
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border p-6">
              <h2 className="text-xl font-semibold">Krediidid</h2>
              <div className="mt-4 space-y-2">
                {data.credits.map((credit) => (
                  <div key={credit.id} className="rounded-xl bg-neutral-50 px-4 py-3 text-sm">
                    <p className="font-medium">{riderById.get(credit.rider_id)?.display_name} · {credit.state === "reserved" ? "broneeringus" : "kasutatav"}</p>
                    <p className="text-gray-600">Kehtib kuni {dateOnly(credit.expires_at)}</p>
                  </div>
                ))}
                {!data.credits.length && <p className="text-sm text-gray-500">Kasutatavaid krediite ei ole.</p>}
              </div>
            </section>

            <section className="rounded-2xl border p-6">
              <h2 className="text-xl font-semibold">Ootenimekiri</h2>
              <div className="mt-4 space-y-2">
                {data.waitlist.map((entry) => (
                  <div key={entry.id} className="rounded-xl bg-neutral-50 px-4 py-3 text-sm">
                    <p className="font-medium">{entry.title} · {riderById.get(entry.rider_id)?.display_name}</p>
                    <p className="text-gray-600">{dateTime(entry.starts_at)} · {waitlistStatus(entry.status)}</p>
                    {entry.status === "offered" && <p className="mt-1 text-green-800">{entry.offer_expires_at ? `Kinnita hiljemalt ${dateTime(entry.offer_expires_at)}` : "Pakkumine kehtib kuni vastad."}</p>}
                  </div>
                ))}
                {!data.waitlist.length && <p className="text-sm text-gray-500">Aktiivseid ootenimekirju ei ole.</p>}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
