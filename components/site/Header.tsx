"use client";

import Link from "next/link";
import { useState } from "react";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur dark:bg-black/80 border-b">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold">
          Ponimetsa Tall
        </Link>

        <nav className="hidden md:flex gap-4 text-sm">
          <Link href="/" className="hover:underline">Avaleht</Link>
          <Link href="/services" className="hover:underline">Hinnakiri</Link>
          <Link href="/booking" className="hover:underline">Broneeri aeg</Link>
          <Link href="/about" className="hover:underline">Meist</Link>
          <Link href="/contact" className="hover:underline">Kontakt</Link>
          {/*
          <Link href="/mkrosetid" className="hover:underline">MK rosetid</Link>
          */}
        </nav>

        <div className="flex items-center gap-3 md:hidden">
          <Link
            href="/booking"
            className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white"
          >
            Broneeri
          </Link>

          <button
            onClick={() => setOpen(!open)}
            className="text-xl leading-none"
            aria-label="Menu"
          >
            ☰
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t bg-white dark:bg-black">
          <nav className="flex flex-col px-4 py-3 text-sm gap-3">
            <Link href="/" onClick={() => setOpen(false)}>Avaleht</Link>
            <Link href="/services" onClick={() => setOpen(false)}>Hinnakiri</Link>
            <Link href="/booking" onClick={() => setOpen(false)}>Broneeri aeg</Link>
            <Link href="/about" onClick={() => setOpen(false)}>Meist</Link>
            <Link href="/contact" onClick={() => setOpen(false)}>Kontakt</Link>
            {/*
            <Link href="/mkrosetid" onClick={() => setOpen(false)}>MK rosetid</Link>
            */}
          </nav>
        </div>
      )}
    </header>
  );
}