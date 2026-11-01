import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { TrainingAdminNav } from "@/components/training/TrainingAdminNav";

export default async function TrainingAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin("/admin/training");

  return (
    <div className="min-h-screen bg-[#f5f3ed] text-stone-900">
      <aside className="border-b border-stone-200 bg-[#ebe8df] lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-5 lg:block lg:px-7 lg:pb-8 lg:pt-8">
          <Link href="/admin/training" className="group flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-green-900 text-lg font-bold text-white shadow-sm">P</span>
            <span>
              <strong className="block text-sm tracking-wide text-green-950">PONIMETSA</strong>
              <span className="text-xs text-stone-500">Treeningute haldus</span>
            </span>
          </Link>
          <Link href="/admin" className="rounded-xl border border-stone-300 bg-white/70 px-3 py-2 text-xs font-semibold text-stone-600 transition hover:bg-white lg:mt-6 lg:inline-flex">← Admin</Link>
        </div>

        <TrainingAdminNav />

        <div className="hidden px-7 lg:absolute lg:bottom-7 lg:block lg:w-full">
          <Link href="/admin/training/preview" className="block rounded-2xl border border-stone-300 bg-white/60 p-4 transition hover:bg-white">
            <span className="block text-xs font-bold uppercase tracking-wider text-green-800">Testvaade</span>
            <span className="mt-1 block text-sm text-stone-600">Vaata portaali ratsaniku või lapsevanemana →</span>
          </Link>
        </div>
      </aside>

      <main className="min-w-0 lg:pl-64">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
