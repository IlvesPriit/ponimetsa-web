import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { pool } from "@/lib/db";
import { loadPortalForContact, loadPortalForRider } from "@/lib/training-portal";
import { TrainingPortalView } from "@/components/training/TrainingPortalView";
import { SubmitButton } from "@/components/ui/SubmitButton";

type ContactChoice = {
  id: string;
  legal_name: string;
  email: string | null;
  rider_names: string;
};

type RiderChoice = { id: string; display_name: string };

export default async function TrainingPreviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ contact_id?: string; rider_id?: string }>;
}) {
  await requireAdmin("/admin/training/preview");
  const params = (await searchParams) ?? {};

  const [contactRes, riderRes] = await Promise.all([
    pool.query<ContactChoice>(
      `select c.id, c.legal_name, c.email,
              string_agg(r.display_name, ', ' order by r.display_name) as rider_names
       from public.rider_contacts c
       join public.rider_contact_links links on links.contact_id = c.id
       join public.riders r on r.id = links.rider_id and r.active = true
       where c.active = true
       group by c.id
       order by c.legal_name`
    ),
    pool.query<RiderChoice>(
      `select id, display_name from public.riders where active = true order by display_name`
    ),
  ]);

  const selectedContactId = params.contact_id ?? "";
  const selectedRiderId = params.rider_id ?? "";
  const portal = selectedContactId
    ? await loadPortalForContact(selectedContactId)
    : selectedRiderId
      ? await loadPortalForRider(selectedRiderId)
      : null;

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b bg-neutral-50">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-green-800">Administraatori tööriist</p>
              <h1 className="text-2xl font-semibold">Kasutajavaate testimine</h1>
              <p className="mt-1 text-sm text-gray-600">Vali lapsevanem või ratsanik. Eelvaade ei vaheta sinu kontot ega saada teavitusi.</p>
            </div>
            <Link href="/admin/training" className="rounded-xl border bg-white px-4 py-2 text-sm font-medium">← Treeningute haldus</Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <form method="get" className="flex gap-2 rounded-2xl border bg-white p-3">
              <select name="contact_id" defaultValue={selectedContactId} className="min-w-0 flex-1 rounded-xl border px-3 py-2" required>
                <option value="">Vali lapsevanem või kontakt…</option>
                {contactRes.rows.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.legal_name} — {contact.rider_names}{contact.email ? ` (${contact.email})` : ""}
                  </option>
                ))}
              </select>
              <SubmitButton pendingLabel="Laadin…" className="rounded-xl bg-green-800 px-4 py-2 text-sm font-medium text-white">Näita</SubmitButton>
            </form>

            <form method="get" className="flex gap-2 rounded-2xl border bg-white p-3">
              <select name="rider_id" defaultValue={selectedRiderId} className="min-w-0 flex-1 rounded-xl border px-3 py-2" required>
                <option value="">Vali ratsanik…</option>
                {riderRes.rows.map((rider) => <option key={rider.id} value={rider.id}>{rider.display_name}</option>)}
              </select>
              <SubmitButton pendingLabel="Laadin…" className="rounded-xl bg-green-800 px-4 py-2 text-sm font-medium text-white">Näita</SubmitButton>
            </form>
          </div>
        </div>
      </div>

      {portal ? (
        <TrainingPortalView data={portal} preview />
      ) : (
        <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-gray-600">Vali ülevalt testitav vaade.</div>
      )}
    </div>
  );
}
