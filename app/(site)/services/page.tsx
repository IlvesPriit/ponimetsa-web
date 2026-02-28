

import Link from "next/link";

type PriceRow = {
  label: string;
  price?: string;
  price2?: string;
  unit?: string;
  note?: string;
};

type PriceSection = {
  title: string;
  subtitle?: string;
  columns?: { a: string; b?: string };
  rows: PriceRow[];
  footnotes?: string[];
};

// Source: Ponimetsa Tall price list (Hinnakiri.xlsx)
const sections: PriceSection[] = [
  {
    title: "Hobuse rentimine",
    subtitle: "Kuutasu",
    rows: [
      { label: "Hobuse rentimine (täisrent)*", price: "200 €" },
      { label: "Hobuse rentimine (poolrent)**", price: "100 €" },
    ],
    footnotes: [
      "*Täisrent tähendab, et kogu vastutus hobuse eest (sh hooldus ja kulud) on rentijal.",
      "**Poolrent tähendab, et hobuse kasutus ja kulud jagatakse kokkuleppel.",
    ],
  },
  {
    title: "Treeningutel osalemine",
    subtitle: "Leping 6 kuuks (kuutasu)",
    columns: { a: "Kuutasu talli hobusega", b: "Kuutasu isikliku või rendihobusega" },
    rows: [
      { label: "1× nädalas (4 trenni kuus)", price: "80 €", price2: "70 €" },
      { label: "2× nädalas (8 trenni kuus)", price: "130 €", price2: "120 €" },
      { label: "3× nädalas (12 trenni kuus)", price: "170 €", price2: "150 €" },
    ],
    footnotes: [
      "Grupitreeningutel osaleja paneb hobuse iseseisvalt valmis ja pärast trenni hooldab.",
    ],
  },
  {
    title: "Treeningutel osalemine",
    subtitle: "Ühe korra tasu inimese kohta",
    rows: [
      { label: "1× grupitreeningul osalemine", price: "25 €" },
      { label: "Lisatrenn grupis (lisaks kuupaketile)", price: "12 €" },
      { label: "Eratrenn (kuni 2 sõitjat)", price: "30 €" },
      { label: "5× kaart", price: "110 €" },
      { label: "10× kaart", price: "190 €" },
      { label: "1× algõppe eratreening (0,5 h)*", price: "35 €" },
      { label: "Hobuse rentimine grupile (1 h, kuni 5 inimest)", price: "50 €" },
      { label: "Ponijalutus (0,5 h)", price: "20 €" },
    ],
    footnotes: [
      "*Ratsutamisega alustavad lapsed ja ka täiskasvanud.",
      "Korrakaarti saab kasutada 2 kuu jooksul pärast ostmist.",
      "Ühe grupi- ja eratreeningu pikkus on keskmiselt 1 tund.",
    ],
  },
  {
    title: "Võistlustel osalemine",
    columns: { a: "Tallihobusega (inimese kohta)", b: "Rendi või isikliku hobusega (inimese kohta)" },
    rows: [
      { label: "Hobuse päevatasu", price: "10 €", price2: "—" },
      { label: "Treeneri päevatasu", price: "15 €", price2: "15 €" },
    ],
  },
  {
    title: "Muud teenused",
    rows: [
      { label: "Hobuse sõitmine", price: "20 €", unit: "/kord", note: "Pikema perioodi vältel kokkuleppel." },
      { label: "Treileri rent", price: "35 €", unit: "/ööpäev" },
      { label: "Hobuste transport treileriga*", price: "50 €", note: "Treiler + auto + juht. Lisandub kütusekulu." },
      { label: "Ponijalutus üritusel (1 h, 1 poniga)*", price: "100 €", note: "Treiler + auto + juht + 1 poni." },
      { label: "Ponijalutus üritusel (1 h, 2 poniga)*", price: "180 €", note: "Treiler + auto + juht + 2 poni." },
      {
        label: "Hobuse ülalpidamisteenus*",
        price: "300 €",
        unit: "/kuu",
        note:
          "Hobusel on kindel boksikoht. Hobune veedab päevad väljas, ööseks boks. Täpsemad tingimused kokkuleppel.",
      },
      { label: "Hobuse esitlemine sepale, vetile vms tallipidaja poolt", price: "5 €", unit: "/kord" },
      {
        label: "Hobusele lisasööda andmine, ravimi manustamine",
        price: "5 €",
        unit: "/kord",
        note: "Pikema perioodi vältel kokkuleppel.",
      },
      { label: "Maneeži kasutus külalisele", price: "25 €", unit: "/tund", note: "Kuni 3 hobust." },
    ],
    footnotes: [
      "*Üritustel ponijalutus: 20 km raadiuses kodutallist. Kaugemale lisandub transporditasu vastavalt kokkuleppele.",
    ],
  },
];

function PriceTable({ section }: { section: PriceSection }) {
  const hasTwo = Boolean(section.columns?.b);

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
        {section.subtitle && <p className="text-sm text-gray-600">{section.subtitle}</p>}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-900">Teenuse nimetus</th>
              <th className="px-4 py-3 font-medium text-gray-900">{section.columns?.a ?? "Hind"}</th>
              {hasTwo && <th className="px-4 py-3 font-medium text-gray-900">{section.columns?.b}</th>}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((r) => (
              <tr key={r.label} className="border-t">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{r.label}</div>
                  {r.note && <div className="mt-1 text-xs text-gray-600">{r.note}</div>}
                </td>
                <td className="px-4 py-3 text-gray-900">
                  <span className="font-medium">{r.price ?? "—"}</span>
                  {r.unit && <span className="ml-1 text-gray-600">{r.unit}</span>}
                </td>
                {hasTwo && <td className="px-4 py-3 text-gray-900">{r.price2 ?? "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {section.footnotes?.length ? (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-gray-600">
          {section.footnotes.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function ServicesPage() {
  return (
    <div className="bg-neutral-50">
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">Teenused ja hinnakiri</h1>
          <p className="mt-3 max-w-2xl text-gray-700">
            Siit leiad Ponimetsa Talli teenuste hinnakirja. Kui soovid täpsustada detaile või midagi eraldi kokku
            leppida, võta meiega ühendust.
          </p>

          <p className="mt-6 text-xs text-gray-600">Hinnad on konkreetsed vastavalt hinnakirjale.</p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {sections.map((s) => (
            <PriceTable key={s.title + (s.subtitle ?? "")} section={s} />
          ))}
        </div>

        <div className="mt-14 rounded-2xl border bg-white p-6 text-sm text-gray-700">
          <div className="font-medium text-gray-900">Küsimused või erisoovid?</div>
          <p className="mt-2">
            Kui sul on erisoove (grupid, üritused, pikemad perioodid, transport jne), kirjuta meile ja paneme detailid
            paika.
          </p>
          <div className="mt-4">
            <Link href="/contact" className="inline-flex items-center gap-2 font-medium hover:underline">
              Võta ühendust →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}