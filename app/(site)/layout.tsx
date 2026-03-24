import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://ponimetsa.ee"),
  title: "Ponimetsa Tall",
  description: "🐴 Tall Pärnu külje, kus kohtuvad lõbu, professionaalsus ja personaalne lähenemine!",
  openGraph: {
    title: "Ponimetsa Tall",
    description: "🐴 Tall Pärnu külje, kus kohtuvad lõbu, professionaalsus ja personaalne lähenemine!",
    url: "https://ponimetsa.ee",
    siteName: "Ponimetsa Tall",
    locale: "et_EE",
    type: "website",
    images: [
      {
        url: "https://ponimetsa.ee/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Ponimetsa Tall",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ponimetsa Tall",
    description: "🐴 Tall Pärnu külje, kus kohtuvad lõbu, professionaalsus ja personaalne lähenemine!",
    images: ["https://ponimetsa.ee/images/og-image.jpg"],
  },
};


export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}