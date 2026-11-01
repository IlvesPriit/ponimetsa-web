"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin/training/overview", label: "Ülevaade", icon: "⌂" },
  { href: "/admin/training/calendar", label: "Kalender", icon: "▦" },
  { href: "/admin/training/riders", label: "Ratsanikud", icon: "♙" },
  { href: "/admin/training/groups", label: "Grupid", icon: "◉" },
  { href: "/admin/training/horses", label: "Hobused", icon: "♞" },
  { href: "/admin/training/settings", label: "Seaded", icon: "⚙" },
] as const;

export function TrainingAdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Treeningute haldus" className="flex gap-2 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:overflow-visible lg:px-4 lg:pb-0">
      {ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-green-900 text-white shadow-sm"
                : "text-stone-600 hover:bg-white hover:text-green-950"
            }`}
          >
            <span aria-hidden="true" className="w-5 text-center text-base">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
