"use client";

import { useRouter, useSearchParams } from "next/navigation";

type ServiceItem = { slug: string; title: string };

export default function ServicePicker({
  services,
  value,
}: {
  services: ServiceItem[];
  value: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  function setService(slug: string) {
    const next = new URLSearchParams(sp?.toString() ?? "");
    if (!slug) next.delete("service");
    else next.set("service", slug);

    // keep URL clean: /booking or /booking?service=...
    const qs = next.toString();
    router.push(qs ? `/booking?${qs}` : "/booking");
  }

  return (
    <div>
      <label className="text-sm font-medium">Teenus</label>
      <select
        className="mt-1 w-full rounded-xl border px-4 py-3"
        value={value}
        onChange={(e) => setService(e.target.value)}
      >
        <option value="" disabled>
          Vali teenus…
        </option>
        {services.map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.title}
          </option>
        ))}
      </select>

      <p className="mt-2 text-xs text-gray-600">
        Teenuse valimisel kuvame sobivad vabad ajad. „Muu päring“ puhul saab saata lihtsalt küsimuse.
      </p>
    </div>
  );
}