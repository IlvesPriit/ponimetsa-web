import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://ponimetsa.ee"),
  title: "Ponimetsa Tall",
  description: "🦄Tall Pärnu küljel, kus kohtuvad lõbu, professionaalsus ja personaalne lähenemine!",

  openGraph: {
    title: "Ponimetsa Tall",
    description: "🦄Tall Pärnu küljel, kus kohtuvad lõbu, professionaalsus ja personaalne lähenemine!",
    url: "https://ponimetsa.ee",
    siteName: "Ponimetsa Tall",
    locale: "et_EE",
    type: "website",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Ponimetsa Tall",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Ponimetsa Tall",
    description: "🦄Tall Pärnu küljel, kus kohtuvad lõbu, professionaalsus ja personaalne lähenemine!",
    images: ["/images/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="et">
      <body className="min-h-screen bg-white text-gray-900">{children}</body>
    </html>
  );
}