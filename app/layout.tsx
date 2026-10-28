import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import { Providers } from "@/components/providers";
import { env } from "@/lib/env";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display-face", weight: ["600", "700", "800"], display: "swap" });
const body = Manrope({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: { default: "Tamurt Sending — Envoyez vos colis avec des voyageurs", template: "%s · Tamurt Sending" },
  description: "Tamurt Sending connecte les expéditeurs et les voyageurs pour faciliter l'envoi de colis entre la France et l'Algérie.",
  applicationName: "Tamurt Sending",
  openGraph: { type: "website", locale: "fr_FR", siteName: "Tamurt Sending" },
  twitter: { card: "summary_large_image" },
  icons: { icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }], apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7faf9" },
    { media: "(prefers-color-scheme: dark)", color: "#141b1d" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="fr" dir="ltr" suppressHydrationWarning className={`${display.variable} ${body.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow">
          Aller au contenu
        </a>
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
