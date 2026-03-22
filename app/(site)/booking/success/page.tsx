import Link from "next/link";

export default function BookingSuccessPage({
  searchParams,
}: {
  searchParams?: { type?: string };
}) {
  const type = searchParams?.type ?? "booking";
  const isInquiry = type === "inquiry";

  return (
    <div className="mx-auto max-w-2xl bg-white px-4 py-16 text-gray-900">
      <h1 className="text-3xl font-semibold">
        {isInquiry
          ? "Aitäh! Päring on saadetud."
          : "Aitäh! Broneering on saadetud."}
      </h1>

      <p className="mt-4 text-gray-700">
        {isInquiry
          ? "Saime sinu päringu kätte ja võtame sinuga lähiajal ühendust, et detailid kokku leppida."
          : "Oleme sinu päringu kätte saanud ja kinnitame broneeringu esimesel võimalusel."}
      </p>

      <p className="mt-3 text-gray-700">
        {isInquiry
          ? "Kui soovid midagi lisada või täpsustada, võid meile julgelt kirjutada."
          : "Kui kinnitust ei ole päeva jooksul tulnud, palun võta meiega ühendust."}
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