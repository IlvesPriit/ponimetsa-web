import Link from "next/link";

type PriceRow = {
  label: string;
  price?: string;
  price2?: string;
  unit?: string;
  note?: string;
  priceNote?: string;
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
    title: "Treeningutel osalemine",
    subtitle: "Leping 6 kuuks (kuutasu)",
    columns: { a: "Kuutasu talli hobusega", b: "Kuutasu isikliku või täisrendil hobusega" },
    rows: [
      {
        label: "1× nädalas (4 trenni kuus)",
        price: "80€ / 75€*",
        price2: "70€",
      },
      {
        label: "2× nädalas (8 trenni kuus)",
        price: "135€ / 125€*",
        price2: "120€",
      },
      {
        label: "3× nädalas (12 trenni kuus)",
        price: "175€ / 160€*",
        price2: "150€",
      },
    ],
    footnotes: [
      "Grupitreeningutel osaleja paneb hobuse iseseisvalt valmis ning sõidab erinevate hobustega (va isikliku hobuse omanik). Kui on soov sõita ühe kindla hobusega, on võimalik võtta hobune täis- või poolrendile.",
      "Kuupaketiga treeningutel osalejatega sõlmitakse leping 6 kuuks. Tasumine toimub iga kalendrikuu alguses enne õpilase kalendrikuu esimest treeningut. Küsi tingimusi tutvumiseks.",
      "Vähemalt kahe sama pere liikme puhul, kes osalevad treeningutel korrakaartide ja/või lepingulise kuumaksu alusel, kehtib soodustus -10% iga liikme kohta.",
      "* Avamiskuu soodushinnad.",
    ],
  },
  {
    title: "Treeningutel osalemine",
    subtitle: "Ühe korra tasu inimese kohta",
    rows: [
      { label: "1× grupitreeningul osalemine", price: "25€" },
      { label: "Lisatrenn grupis (lisaks kuupaketile)", price: "15€" },
      {
        label: "Eratrenn (kuni 2 sõitjat)",
        price: "35€",
        note: "Ponimetsa talli kuupaketi kasutajale 25€.",
      },
      { label: "5× kaart", price: "110€" },
      { label: "10× kaart", price: "190€" },
      { label: "1× algõppe eratrenn (0,5–1 h)", price: "35€" },
      { label: "1× ponisõbra trenn (~0,5 h)", price: "25€" },
    ],
    footnotes: [
      "Korrakaarti saab kasutada 2 kuu jooksul pärast soetamist. Vähemalt kahe sama pere liikme puhul, kes osalevad treeningutel korrakaartide ja/või lepingulise kuumaksu alusel, kehtib soodustus -10% iga liikme kohta.",
      "Ratsutamisega alustavad lapsed ja ka täiskasvanud vajavad pidevat juhendamist ja selleks on hea alustada eratreeningutega. Esialgu on kestuseks 30 min ning kui õpilane ja vanemad on huvitatud ka edasistest treeningutest, lisandub sinna juurde ka hobuse hooldamise ja valmispanemise õpetus. Kui treeneri hinnangul on õpilane võimeline iseseisvalt hobusega toimetama ja ratsutama, saab ta liituda grupitreeningutega.",
      "Ponisõbra trenn sisaldab poni harjamise ja saduldamise õppimist ning kuni 15 min käekõrval ponisõitu. Sobib väikelastele, kes soovivad õppida hobuseid tundma, kuid on päris treeningu jaoks alles väikesed. Hea ettevalmistus hilisemaks algõppe treeninguga jätkamiseks.",
      "Ühe grupi- ja eratreeningu pikkus on keskmiselt 50 min.",
    ],
  },
  {
    title: "Võistlustel osalemine",
    columns: { a: "Ühe korra tasu tallihobusega (inimese kohta)", b: "Ühe korra tasu rendi või isikliku hobusega (inimese kohta)" },
    rows: [
      { label: "Hobuse päevatasu", price: "10€", price2: "—" },
      { label: "Treeneri päevatasu", price: "15€", price2: "15€" },
    ],
  },
  {
    title: "Ponijalutus ja elamusõidud",
    rows: [
      { label: "Hobuse rentimine grupile 1 h (kuni 5 inimest)", price: "50€" },
      { label: "Ponijalutus 0,5 h", price: "20€" },
      {
        label: "Maastikusõit 1 h",
        price: "45€",
        unit: "/inimene",
        note: "Ponimetsa talli paketi või kuukardi kasutajale 35€.",
      },
    ],
  },
  {
    title: "Hobuse rentimine",
    subtitle: "Kuutasu",
    rows: [
      { label: "Hobuse rentimine (täisrent)", price: "200€" },
      { label: "Hobuse rentimine (poolrent)", price: "100€" },
    ],
    footnotes: [
      "Täisrent tähendab, et kogu vastutus hobuse eest on rentnikul ning keegi teine hobusega treeningutel ei osale. Hobuse rendi leping sõlmitakse aastaks. Hobuse täisrent sisaldab vaid hobuse pidamiskulusid ja hobuse renti. Sellele lisanduvad treeningute tasud ja vastavalt vajadusele muud hoolduskulud (nt kapjade hooldus, 1–2× aastas ussirohi ja vaktsineerimine, vajadusel muud ravimid, soovi korral lisasöödad). Võistlustel osaledes lisanduvad võistluste tasud ja hobuse aastalitsents Ratsaspordi Liidule.",
      "Poolrent tähendab, et igal kokkulepitud treeningul on rentnikule kindlustatud renditud hobune, kuid teistel aegadel võivad hobusega sõita ka teised ratsanikud. Hobuse rendi leping sõlmitakse aastaks. Poolrendi tasule lisanduvad treeningute tasud. Võistlustel osaledes lisanduvad võistluste tasud ja aastalitsents Ratsaspordi Liidule ning 0,5× hobuse hoolduste ja vaktsineerimise tasud.",
    ],
  },
  {
    title: "Hobuse ülalpidamisteenus",
    rows: [
      {
        label: "Hobuse ülalpidamisteenus",
        price: "200€",
        unit: "/kuu",
        note:
          "Hobusel on kindel boksikoht. Hobune veedab päeva vastavalt ilmale koplis ning öösel 4 × 3 m boksis. Hind sisaldab hein/silo, vett, soola, 1× päevas jõusööda andmist (sööt omaniku poolt), talvel vajadusel tekitamist ning platsi kasutust grupitreeningute- ja muude broneeritud treeningute välisel ajal.",
      },
      { label: "Hobuse majutus 24 h", price: "25€" },
      { label: "Hobuse esitlemine sepale, vetile vms tallipidaja poolt", price: "5€", unit: "/kord" },
      {
        label: "Hobusele lisasööda andmine, ravimi manustamine",
        price: "5€",
        unit: "/päev",
        note: "Pikema perioodi vältel kokkuleppel.",
      },
      //{ label: "Maneeži kasutus külalisele", price: "25€", unit: "/tund", note: "Kuni 2 hobust." },
    ],
  },
  {
    title: "Muud teenused",
    rows: [
      { label: "Hobuse sõitmine", price: "20€", unit: "/kord", note: "Pikema perioodi vältel kokkuleppel." },
      { label: "Treileri rent", price: "35€", unit: "/ööpäev" },
      {
        label: "Hobuste transport treileriga",
        price: "50€",
        note: "Treiler + auto + juht. Lisandub 0,5€ kilomeetri kohta Ponimetsa klientidele, välistele klientidele 0,8€ kilomeetri kohta.",
      },
      { label: "Ponijalutus üritusel 1 h 1 poniga", price: "100€", note: "Treiler + auto + juht + 1 poni." },
      { label: "Ponijalutus üritusel 1 h 2 poniga", price: "180€", note: "Treiler + auto + juht + 2 poni." },
    ],
    footnotes: [
      "Ponijalutus üritusel: 20 km raadiuses kodutallist. Kaugemale lisandub 1€ kilomeetri kohta.",
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
                  <span className="text-gray-900">{r.price ?? "—"}</span>
                  {r.unit && <span className="ml-1 text-gray-600">{r.unit}</span>}
                </td>
                {hasTwo && <td className="px-4 py-3 text-gray-900">{r.price2 ?? "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {section.footnotes?.length ? (
        <ul className="mt-4 space-y-1 pl-5 text-xs text-gray-600">
          {section.footnotes.map((t) =>
            t.startsWith("*") ? (
              <li key={t} className="list-none mt-3 pt-3 border-t text-gray-700">
                <span className="font-medium">*</span> {t.slice(1).trim()}
              </li>
            ) : (
              <li key={t} className="list-disc">
                {t}
              </li>
            )
          )}
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