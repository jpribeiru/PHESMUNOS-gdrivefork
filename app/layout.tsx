import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";
const dmSans = localFont({
  src: "./fonts/DMSans.ttf",
  variable: "--font-dm",
  display: "swap",
});
const manrope = localFont({
  src: "./fonts/Manrope.ttf",
  variable: "--font-manrope",
  display: "swap",
});
import { OfflineShell } from "@/components/offline-shell";
import { ConferenceShell } from "@/components/conference-shell";
import { BRAND, PLATFORM } from "@/lib/brand";
export const metadata: Metadata = {
  title: `${BRAND.product} · ${BRAND.conferenceName}`,
  description: `Conference operations for ${BRAND.conferenceName}. Powered by ${PLATFORM.name}, created by ${PLATFORM.creator}.`,
  applicationName: BRAND.product,
  authors: [{ name: PLATFORM.creator, url: PLATFORM.creatorUrl }],
  creator: PLATFORM.creator,
  generator: PLATFORM.name,
  robots: { index: false, follow: false },
  icons: { icon: [{ url: "/favicon-48.png", sizes: "48x48", type: "image/png" }, { url: "/phesmun-icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/apple-touch-icon.png" },
  other: { copyright: PLATFORM.copyright },
};
export const viewport = { themeColor: "#2b4e16" };
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${manrope.variable}`}>
        <ConferenceShell>{children}</ConferenceShell>
        <OfflineShell />
      </body>
    </html>
  );
}
