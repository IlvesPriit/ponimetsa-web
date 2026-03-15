"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Image
            src="/images/logo.png"
            alt="Ponimetsa Tall logo"
            width={50}
            height={50}
            className="rounded-sm"
          />
          <span>Ponimetsa Tall</span>
        </Link>

        <nav className="hidden md:flex gap-4 text-sm text-gray-900">
          <Link href="/" className="hover:underline">Avaleht</Link>
          <Link href="/services" className="hover:underline">Hinnakiri</Link>
          {/*
          <Link href="/booking" className="hover:underline">Broneeri aeg</Link>
          */}
          <Link href="/about" className="hover:underline">Meist</Link>
          <Link href="/contact" className="hover:underline">Kontakt</Link>
          {/*
          <Link href="/mkrosetid" className="hover:underline">MK rosetid</Link>
          */}
        </nav>
        <div className="flex items-center gap-3 md:hidden">
          <button
            onClick={() => setOpen(!open)}
            className="text-black text-xl leading-none"
            aria-label="Menu"
          >
            ☰
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t bg-white text-gray-900">
          <nav className="flex flex-col px-4 py-3 text-sm gap-3">
            <Link href="/" onClick={() => setOpen(false)}>Avaleht</Link>
            <Link href="/services" onClick={() => setOpen(false)}>Hinnakiri</Link>
            {/*
            <Link href="/booking" onClick={() => setOpen(false)}>Broneeri aeg</Link>
            */}
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