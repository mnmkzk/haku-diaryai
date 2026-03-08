import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Haku | あなたの全てを受け入れる親友",
  description: "否定せず、ただ寄り添う。AI Chill Buddy と作る、あなただけの心の記録。",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#A855F7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className={notoSansJP.className}>{children}</body>
    </html>
  );
}
