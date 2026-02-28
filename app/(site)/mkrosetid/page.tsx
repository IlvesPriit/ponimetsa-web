

import Image from "next/image";
import Link from "next/link";

export default function MKRosetidPage() {
  return (
    <div className="bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-16">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-neutral-900 sm:text-6xl">
            MK Rosetid
          </h1>
          <div className="mx-auto mt-5 h-1 w-28 rounded bg-amber-700" />
          <p className="mx-auto mt-8 max-w-4xl text-lg leading-relaxed text-neutral-600 sm:text-xl">
            Ponimetsa Tallile kuulub ka MKrosetid – väike käsitööbränd, mis valmistab kauneid
            rosette kingitusteks, üritusteks, dekoratsiooniks või võistluste jaoks. Kõik rosetid
            valmivad käsitööna ning on võimalik tellida täpselt sinu soovide järgi.
          </p>
        </div>

        {/* Content */}
        <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:items-start">
          {/* Image */}
          <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
            <div className="relative aspect-[16/10] w-full">
              <Image
                src="/mkrosetid/rosetid.jpeg"
                alt="MK Rosetid – käsitöö rosetid"
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
              />
            </div>
          </div>

          {/* Feature cards */}
          <div className="space-y-6">
            <div className="rounded-3xl border bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-neutral-900">Käsitöö kvaliteet</h2>
              <p className="mt-3 text-base leading-relaxed text-neutral-600">
                Iga rosett on valmistatud käsitööna, tagades ainulaadse ja kvaliteetse tulemuse.
              </p>
            </div>

            <div className="rounded-3xl border bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-neutral-900">Individuaalne disain</h2>
              <p className="mt-3 text-base leading-relaxed text-neutral-600">
                Võimalik tellida rosette täpselt sinu soovide ja vajaduste järgi – värv, suurus ja
                disain.
              </p>
            </div>

            <div className="rounded-3xl border bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-neutral-900">Mitmekülgne kasutus</h2>
              <p className="mt-3 text-base leading-relaxed text-neutral-600">
                Sobivad võistlustele, kingitusteks, ürituste dekoratsiooniks ja paljuks muuks.
              </p>
            </div>

          </div>
        </div>

        {/* Instagram feed */}
        <div className="mt-20">
          <h2 className="text-3xl font-semibold text-neutral-900 text-center">
            Viimased tööd Instagramis
          </h2>
          <p className="mt-2 text-center text-neutral-600">
            Rohkem näiteid ja ideid leiad meie Instagrami lehelt.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <iframe
              src="https://www.instagram.com/p/DLC2vkjt5ts/embed"
              className="w-full rounded-xl border"
              height="480"
              loading="lazy"
            />
            <iframe
              src="https://www.instagram.com/p/DJcS30QMzgP/embed"
              className="w-full rounded-xl border"
              height="480"
              loading="lazy"
            />
            <iframe
              src="https://www.instagram.com/p/DIMgpWbsiw4/embed"
              className="w-full rounded-xl border"
              height="480"
              loading="lazy"
            />
          </div>
        </div>

        {/* Contact / inquiry section */}
        <div className="mt-20 grid gap-10 lg:grid-cols-2">
          {/* Contact info */}
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-neutral-900">
              Tellimine ja kontakt
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              Tellimiseks kirjuta meile Messengeris, helista või saada päring alloleva vormi kaudu.
              Võtame sinuga ühendust esimesel võimalusel.
            </p>

            <div className="space-y-2 text-neutral-700">
              <p>Messenger: Ponimetsa Tall / MK Rosetid</p>
              <p>Telefon: +372 …</p>
              <p>E-post: …</p>
            </div>
          </div>

          {/* Inquiry form */}
          <form className="rounded-3xl border bg-white p-6 shadow-sm space-y-4">
            <div>
              <label className="text-sm font-medium">Nimi</label>
              <input
                type="text"
                name="name"
                className="mt-1 w-full rounded-xl border px-4 py-3"
                placeholder="Sinu nimi"
              />
            </div>

            <div>
              <label className="text-sm font-medium">E-post või telefon</label>
              <input
                type="text"
                name="contact"
                className="mt-1 w-full rounded-xl border px-4 py-3"
                placeholder="Kuidas saame sinuga ühendust võtta"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Soov / päring</label>
              <textarea
                name="message"
                rows={5}
                className="mt-1 w-full rounded-xl border px-4 py-3"
                placeholder="Kirjelda, milliseid rosette soovid tellida…"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-900 hover:bg-neutral-50"
            >
              Saada päring
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}