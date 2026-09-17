import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Buku Piutang Toko",
  description: "Catat, pantau, dan pulihkan riwayat piutang toko dalam satu layar.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
