import "./globals.css";

export const metadata = {
  title: "Ponimetsa Tall",
  description: "Ponimetsa tall – hobused, loodus ja rahu Pärnumaal.",
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