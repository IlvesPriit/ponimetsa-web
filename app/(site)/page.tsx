"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { FacebookPagePlugin } from "@/components/site/FacebookPagePlugin";

type ServiceBullet =
  | string
  | {
      text: string;
      children: string[];
    };

type Service = {
  title: string;
  image: string;
  intro: string;
  bullets: ServiceBullet[];
  note?: string;
  imageClassName?: string;
};

const services: readonly Service[] = [
    {
      title: "🐴 Ratsatrennid lastele ja täiskasvanutele",
      image: "/images/services/service1.jpg",
      imageClassName: "object-[center_3%]",
      intro:
        "Pakume treeninguid nii alustavatele kui ka edasijõudnud ratsanikele – lastest täiskasvanuteni.",
      bullets: [
        {
          text: "Grupitreeningud lastele ja täiskasvanutele (ka võistlemise võimalus)",
          children: [
            "Lepinguline kuumaks 6 kuuks",
            "Korrakaardid: 5x ja 10x kaart kehtivusega 2 kuud",
            "Ühekordse tasu võimalus",
          ],
        },
        "Eratreeningud edasijõudnutele – kuni 2 õpilast korraga",
        "Algõpe lastele ja täiskasvanutele – alustavatele õpilastele, lapsed alates 6. eluaastast",
        "Maastikusõit – 1 h ratsutamist metsaradadel vastavalt sõitja oskustele",
      ],
      note: "Treener Mariann-Krõõt Ilves (EKR3 tase).",
    },
    {
      title: "🦄 Väikelastele",
      image: "/images/services/service2.jpg",
      imageClassName: "object-[center_33%]",
      intro:
        "Ponidega sõbraks saamiseks ja tallielu avastamiseks pakume väiksematele lastele mitut toredat võimalust.",
      bullets: [
        "Ponisõit juhendaja käekõrval – alates 10 minutist (5 min / 5 € ja 30 min / 20 €)",
        "Väikese ponisõbra trenn – poni harjamise ja saduldamise õppimine + kuni 15 min ponisõitu (25 € / kord)",
        "Ponitunnid väikelaste gruppidele – tutvume talli ja ponidega, vaatame mida ponid söövad, harjame ja saduldame poni ning saame sõita",
      ],
      note: "Ponitundide toimumisajad lisame oma sotsiaalmeediakontodele. Võimalik tellida ka eraüritus – võta meiega ühendust.",
    },
    {
      title: "🐎 Hobuse pidamisteenus",
      image: "/images/services/service3.jpg",
      intro:
        "Pakume nii lühi- kui pikaajalisi pidamiskohti ruunale või märale boksiüüri vormis.",
      bullets: [
        "Päeval on hobused vastavalt ilmale võimalikult kaua õues ja öösel 3 × 4 m boksis",
        "Teenuses sisaldub hein või silo, vesi, sool boksis ja kindel boksikoht",
        "Lisaks boksi koristamine, kopeldamine ja sõiduplatsi kasutamine",
        "Soovi korral 1× päevas jõusööda andmine (sööt hobuomaniku poolt)",
        "Vajadusel talvisel perioodil tekitamine",
        "Hobuse majutus lühiajaliselt – 25 € / 24 h",
        "Hobuse majutus pikaajaliselt – 200 € / kuu",
      ],
    },
  ];

export default function HomePage() {
  useEffect(() => {
    const id = "instagram-embed-script";

    const process = () => {
      try {
        // Instagram embed script exposes window.instgrm.Embeds.process()
        // We call it to transform blockquotes into embeds.
        (window as any).instgrm?.Embeds?.process?.();
      } catch {
        // ignore
      }
    };

    // If script already present, just process.
    if (document.getElementById(id)) {
      process();
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.async = true;
    script.defer = true;
    script.src = "https://www.instagram.com/embed.js";
    script.onload = () => process();
    document.body.appendChild(script);

    // Also try once shortly after mount.
    const t = window.setTimeout(process, 500);

    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className="flex flex-col">
      {/* HERO */}
<section className="relative min-h-[80vh] w-full overflow-hidden">
  <Image
    src="/images/hero.jpeg"
    alt="Ponimetsa Tall"
    fill
    priority
    className="object-cover"
  />

  {/* overlay – parem loetavus */}
  <div className="absolute inset-0 bg-black/35" />

  {/* CONTENT: täislaius + keskele */}
  <div className="relative flex min-h-[80vh] items-center">
    <div className="mx-auto w-full max-w-6xl px-4 text-center">
      <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
        Ponimetsa Tall
      </h1>

      <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90 sm:text-xl">
      Tall Pärnu küljel, kus kohtuvad lõbu, professionaalsus ja personaalne lähenemine!
      </p>

    </div>
  </div>

  {/* fade to next section – light/dark mode ühtlane */}
  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-white dark:to-black" />
</section>
      {/* INTRO */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-4xl font-semibold text-gray-900">
            Tere tulemast
          </h2>
          <div className="mx-auto mt-4 h-1 w-20 rounded bg-amber-700" />

          <p className="mx-auto mt-8 max-w-4xl text-center text-lg leading-relaxed text-gray-700">
            Rahulik ja looduslähedane hobutall Reiu külas, Lottemaa vahetus läheduses.
          </p>

          <p className="mx-auto mt-5 max-w-4xl text-center text-lg leading-relaxed text-gray-700">
            Tallis tegutseb treener Mariann-Krõõt Ilves, kellel on üle 20-aastane kogemus
            hobu- ja ratsamaailmas ning EKR3 taseme ratsutamise treeneri kutse.
            Pakume ratsutamise algõppe eratreeninguid ja grupitreeninguid nii lastele kui
            täiskasvanutele, samuti hobuse pidamisteenust.
          </p>

          <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border bg-white p-5 text-center shadow-sm">
              <div className="text-sm font-semibold text-gray-900">Atesteeritud treener</div>
              <div className="mt-1 text-sm text-gray-700">EKR3 kutse ja 20+ aastat kogemust.</div>
            </div>
            <div className="rounded-2xl border bg-white p-5 text-center shadow-sm">
              <div className="text-sm font-semibold text-gray-900">Personaalsus</div>
              <div className="mt-1 text-sm text-gray-700">Läheneme igale õpilasele eesmärkide järgi.</div>
            </div>
            <div className="rounded-2xl border bg-white p-5 text-center shadow-sm">
              <div className="text-sm font-semibold text-gray-900">Hea ligipääs</div>
              <div className="mt-1 text-sm text-gray-700">13 min Pärnu kesklinnast, bussipeatus ~400 m.</div>
            </div>
          </div>
          <div className="mt-8 flex justify-center">
            <Link
              href="/about"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-900 hover:bg-neutral-50"
            >
              Loe meie lugu →
            </Link>
          </div>
        </div>
      </section>

     {/* SERVICES */}
<section className="bg-neutral-50">
  <div className="mx-auto max-w-6xl px-4 py-16">
    <h2 className="text-center text-3xl font-semibold text-gray-900">
      Teenused
    </h2>
    <p className="mx-auto mt-2 max-w-3xl text-center text-gray-700">
      Valik meie peamistest teenustest. Täpsem info ja ajad on kokkuleppel.
    </p>

    <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {services.map((s) => (
        <div key={s.title} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="relative h-52 w-full">
            <Image
              src={s.image}
              alt={s.title}
              fill
              className={s.imageClassName ? `object-cover ${s.imageClassName}` : "object-cover"}
            />
          </div>

          <div className="p-6">
            <div className="text-xl font-semibold text-gray-900">
              {s.title}
            </div>

            <p className="mt-3 text-sm leading-relaxed text-gray-700">
              {s.intro}
            </p>

            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-700">
              {s.bullets.map((b) => {
                if (typeof b === "string") {
                  return <li key={b}>{b}</li>;
                }

                return (
                  <li key={b.text}>
                    {b.text}
                    <ul className="mt-2 list-none space-y-1 pl-4 text-sm text-gray-600">
                      {b.children.map((child) => (
                        <li key={child}>– {child}</li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>

            {s.note && (
              <p className="mt-4 rounded-xl bg-neutral-50 p-3 text-xs text-gray-600">
                {s.note}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
    <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <Link
        href="/services"
        className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-900 hover:bg-neutral-50"
      >
        Vaata kogu hinnakirja →
      </Link>
    </div>
  </div>
</section>

      {/* SOCIAL FEED */}
        <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className="text-3xl font-semibold text-gray-900">Uudised ja postitused</h2>
            <p className="mt-2 text-gray-700">
            Viimased postitused sotsiaalmeediast.
            </p>

            <div className="mt-8 grid gap-6">
            {/* Facebook */}
            <div className="rounded-2xl border p-3 sm:p-4">
            <div className="px-2 pb-3 text-sm font-medium text-gray-900">
                Facebook
            </div>

            <div className="overflow-hidden rounded-xl bg-white">
              <FacebookPagePlugin />
            </div>

            <div className="mt-4 px-2">
                <a
                href="https://www.facebook.com/p/Ponimetsa-tall-61578838420269/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-neutral-50"
                >
                Ava Facebook →
                </a>
            </div>
            </div>
    </div>
  </div>
</section>
      {/* CONTACT */}
      <section id="contact" className="bg-neutral-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-semibold text-gray-900">
            Kontakt
          </h2>
          <p className="mx-auto mt-2 max-w-3xl text-center text-gray-700">
            Võta meiega ühendust ja tule külla. Asume Reiu külas, Lottemaa vahetus läheduses.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            {/* Contact details */}
            <div className="rounded-2xl border bg-white p-6">
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <div className="font-medium text-gray-900">Ponimetsa Tall</div>
                  <div>Reiu küla, Pärnumaa</div>
                </div>

                <div>
                  <div className="font-medium text-gray-900">Telefon</div>
                  <a href="tel:+37256968282" className="hover:underline">
                    +372 5696 8282
                  </a>
                </div>

                <div>
                  <div className="font-medium text-gray-900">E-post</div>
                  <a href="mailto:ponimetsa@hotmail.com" className="hover:underline">
                    ponimetsa@hotmail.com
                  </a>
                </div>

                <div className="pt-2 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/booking?kind=inquiry"
                    className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-neutral-50"
                  >
                    Saada kiire päring
                  </Link>

                  <a
                    href="https://www.facebook.com/p/Ponimetsa-tall-61578838420269/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-neutral-50"
                  >
                    Kirjuta Facebookis
                  </a>
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="overflow-hidden rounded-2xl border">
              <iframe
                title="Ponimetsa Tall asukoht"
                src="https://www.google.com/maps?output=embed&q=Ponimetsa%20tall&ll=58.3090318,24.5991591&z=15"
                className="h-[360px] w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}