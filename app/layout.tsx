import "./globals.css";
import type { Metadata } from "next";

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
        url: "https://ponimetsa.ee/images/og-image.jpeg",
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
    images: ["https://ponimetsa.ee/images/og-image.jpeg"],
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