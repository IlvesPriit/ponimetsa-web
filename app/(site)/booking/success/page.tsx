import Link from "next/link";

export default function BookingSuccessPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold">
        Aitäh! Broneering on saadetud.
      </h1>

      <p className="mt-4 text-gray-700">
        Oleme sinu päringu kätte saanud ja kinnitame broneeringu
        esimesel võimalusel — tavaliselt 2 tunni jooksul.
      </p>

      <p className="mt-3 text-gray-700">
        Kui kinnitust ei ole tulnud, palun võta meiega ühendust.
      </p>

      <div className="mt-8 flex gap-3">
        <Link href="/" className="rounded-xl border px-5 py-3 text-sm font-medium">
          Avalehele
        </Link>
        <Link
          href="/contact"
          className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white"
        >
          Kontakt
        </Link>
      </div>
    </div>
  );
}