import Link from "next/link";
import { createClient } from "../../lib/supabase/server";
import { requireAdmin } from "../../lib/admin";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  await requireAdmin("/admin");

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-semibold">Admin</h1>
      <p className="mt-2 text-gray-700">
        Sisselogitud kasutaja: <span className="font-medium">{data.user?.email}</span>
      </p>

      <div className="mt-8 flex gap-3">
        <Link href="/admin/slots" className="rounded-xl border px-5 py-3 text-sm font-medium">
          Vabad ajad
        </Link>
        <Link href="/admin/bookings" className="rounded-xl border px-5 py-3 text-sm font-medium">
          Broneeringud
        </Link>
      </div>
    </div>
  );
}