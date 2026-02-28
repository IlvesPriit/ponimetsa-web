import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur dark:bg-black/80 border-b">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold">
          Ponimetsa Tall
        </Link>

        <nav className="flex gap-4 text-sm">
          <Link href="/" className="hover:underline">
            Avaleht
          </Link>
          <Link href="/services" className="hover:underline">
            Teenused
          </Link>
          <Link href="/booking" className="hover:underline">
            Broneeri aeg
          </Link>
          <Link href="/about" className="hover:underline">
            Meist
          </Link>
          <Link href="/contact" className="hover:underline">
            Kontakt
          </Link>
          <Link href="/mkrosetid" className="hover:underline">
            MK rosetid
          </Link>
        </nav>
      </div>
    </header>
  );
}