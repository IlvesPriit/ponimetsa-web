"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { FacebookPagePlugin } from "@/components/site/FacebookPagePlugin";

type Service = {
  title: string;
  image: string;
  intro: string;
  bullets: string[];
  note?: string;
};

const services: readonly Service[] = [
    {
      title: "🐴 Ratsatrennid lastele",
      image: "/images/services/service1.jpeg",
      intro:
        "Ootame lapsi ratsatrenni! Algõppesse ootame alates 6-aastaseid lapsi, väiksematele pakume käekõrval ponisõitu.",
      bullets: [
        "Algõppe eratrenn – 30 €",
        "Käekõrval ponisõit (30 min) – 20 €",
        "Treener: EKR3 ratsatreener Mariann-Krõõt Ilves",
      ],
    },
    {
      title: "🦄 Ponitunnid väikelastele",
      image: "/images/services/service2.jpeg",
      intro:
        "Vahvad ponitunnid lastele, kes soovivad hobustega sõbraks saada ja tallielu tundma õppida. Sobib alates 5. eluaastast (nooremad koos lapsevanemaga).",
      bullets: [
        "Tutvume talliga ja vaatame, kus ponid elavad",
        "Saame teada, mida ponid söövad",
        "Harjame ja saduldame poni",
        "Iga laps saab ~5 min ponisõidu",
        "Tunni lõpus anname ponidele porgandit",
        "Hind: 10 € / laps; iga järgmine sama pere laps 5 €",
      ],
      note: "Ponitundide toimumisaegadel hoia pilk peal meie Facebooki lehel. Eraürituste jaoks võta ühendust.",
    },
    {
      title: "🐎 Boksi koht hobusele",
      image: "/images/services/service3.jpeg",
      intro:
        "Pakume pidamiskohti märale või ruunale. Sobib noorele kasvavale hobusele, pensionärile või harrastushobusele.",
      bullets: [
        "Päeval on hobune ilmast sõltuvalt võimalikult kaua õues",
        "Ööseks 3 × 4 m boks",
        "Hobi korras võimalik ratsutada ja hüpata",
        "Soovi korral treeneri trennid ka kohapeal",
        "Hoolitseme sinu hobuse eest sama hoolega nagu enda oma",
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
        Kodune ja looduslähedane koht hobustele Reiu külas, Pärnumaal.
      </p>

    </div>
  </div>

  {/* fade to next section – light/dark mode ühtlane */}
  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-white dark:to-black" />
</section>
      {/* INTRO */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-4xl font-semibold text-gray-900 dark:text-gray-100">
            Tere tulemast
          </h2>
          <div className="mx-auto mt-4 h-1 w-20 rounded bg-amber-700" />

          <p className="mx-auto mt-8 max-w-4xl text-center text-lg leading-relaxed text-gray-700 dark:text-gray-300">
            Rahulik ja looduslähedane hobutall Reiu külas, Lottemaa vahetus läheduses –
            mugav ligipääs ja kaunis loodus igast küljest.
          </p>

          <p className="mx-auto mt-5 max-w-4xl text-center text-lg leading-relaxed text-gray-700 dark:text-gray-300">
            Tallis tegutseb treener Mariann-Krõõt Ilves, kellel on üle 20-aastane kogemus
            hobu- ja ratsamaailmas ning EKR3 taseme ratsutamise treeneri kutse.
            Pakume ratsutamise algõppe eratreeninguid ja grupitreeninguid nii lastele kui
            täiskasvanutele, samuti hobuse pidamisteenust.
          </p>

          <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border bg-white p-5 text-center shadow-sm dark:border-gray-800 dark:bg-neutral-950">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Atesteeritud treener</div>
              <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">EKR3 kutse ja 20+ aastat kogemust.</div>
            </div>
            <div className="rounded-2xl border bg-white p-5 text-center shadow-sm dark:border-gray-800 dark:bg-neutral-950">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Personaalsus</div>
              <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">Läheneme igale õpilasele eesmärkide järgi.</div>
            </div>
            <div className="rounded-2xl border bg-white p-5 text-center shadow-sm dark:border-gray-800 dark:bg-neutral-950">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Hea ligipääs</div>
              <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">13 min Pärnust, bussipeatus ~400 m.</div>
            </div>
          </div>
          <div className="mt-8 flex justify-center">
            <Link
              href="/about"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-900 hover:bg-neutral-50 dark:border-gray-700 dark:bg-neutral-950 dark:text-gray-100 dark:hover:bg-neutral-900"
            >
              Loe meie lugu →
            </Link>
          </div>
        </div>
      </section>

     {/* SERVICES */}
<section className="bg-neutral-50">
  <div className="mx-auto max-w-6xl px-4 py-16">
    <h2 className="text-center text-3xl font-semibold text-gray-900 dark:text-gray-100">
      Teenused
    </h2>
    <p className="mx-auto mt-2 max-w-3xl text-center text-gray-700 dark:text-gray-300">
      Valik meie peamistest teenustest. Täpsem info ja ajad on kokkuleppel.
    </p>

    <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {services.map((s) => (
        <div key={s.title} className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-neutral-950">
          <div className="relative h-44 w-full">
            <Image src={s.image} alt={s.title} fill className="object-cover" />
          </div>

          <div className="p-6">
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {s.title}
            </div>

            <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {s.intro}
            </p>

            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-700 dark:text-gray-300">
              {s.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>

            {s.note && (
              <p className="mt-4 rounded-xl bg-neutral-50 p-3 text-xs text-gray-600 dark:bg-neutral-900 dark:text-gray-300">
                {s.note}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
    <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <Link
        href="/booking"
        className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-900 hover:bg-neutral-50 dark:border-gray-700 dark:bg-neutral-950 dark:text-gray-100 dark:hover:bg-neutral-900"
      >
        Broneeri ponisõit või eratrenn kohe!
      </Link>

      <Link
        href="/services"
        className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-900 hover:bg-neutral-50 dark:border-gray-700 dark:bg-neutral-950 dark:text-gray-100 dark:hover:bg-neutral-900"
      >
        Vaata kõiki teenuseid →
      </Link>
    </div>
  </div>
</section>

      {/* SOCIAL FEED */}
        <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className="text-3xl font-semibold text-gray-900">Uudised ja postitused</h2>
            <p className="mt-2 text-gray-700">
            Viimased postitused otse sotsiaalmeediast.
            </p>

            <div className="mt-8 grid gap-6">
            {/* Facebook */}
            <div className="rounded-2xl border p-3 sm:p-4">
            <div className="px-2 pb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                Facebook
            </div>

            <div className="overflow-hidden rounded-xl bg-white dark:bg-neutral-950">
              <FacebookPagePlugin />
            </div>

            <div className="mt-4 px-2">
                <a
                href="https://www.facebook.com/p/Ponimetsa-tall-61578838420269/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900"
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
          <h2 className="text-center text-3xl font-semibold text-gray-900 dark:text-gray-100">
            Kontakt
          </h2>
          <p className="mx-auto mt-2 max-w-3xl text-center text-gray-700 dark:text-gray-300">
            Võta meiega ühendust või tule külla. Asume Reiu külas, Lottemaa vahetus läheduses.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            {/* Contact details */}
            <div className="rounded-2xl border bg-white p-6 dark:bg-neutral-950">
              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Ponimetsa Tall</div>
                  <div>Reiu küla, Pärnumaa</div>
                </div>

                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Telefon</div>
                  <a href="tel:+372" className="hover:underline">
                    +372 …
                  </a>
                </div>

                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">E-post</div>
                  <a href="mailto:info@ponimetsatall.ee" className="hover:underline">
                    info@ponimetsatall.ee
                  </a>
                </div>

                <div className="pt-4">
                  <Link
                    href="/booking"
                    className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-900 hover:bg-neutral-50 dark:border-gray-700 dark:bg-neutral-950 dark:text-gray-100 dark:hover:bg-neutral-900"
                  >
                    Broneeri ponisõit / eratrenn
                  </Link>
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