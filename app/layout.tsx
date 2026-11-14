import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Noto_Sans, Signika } from "next/font/google";
import { Providers } from "@/components/providers";
import { env } from "@/lib/env";
import "./globals.css";

// Signika, la police de Tamurt Transport : dessinée pour la signalétique (gares, aéroports).
// Pas de police de repli ajustée : la pile reste Signika puis Noto Sans, qui couvre ɛ, ɣ et les lettres kabyles.
const signika = Signika({ subsets: ["latin", "latin-ext"], variable: "--font-signika", display: "swap", adjustFontFallback: false });
// Téléchargée seulement si une lettre manque à Signika.
const noto = Noto_Sans({ subsets: ["latin-ext"], variable: "--font-noto", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: { default: "Tamurt Transport — De main en main, jusqu’au pays", template: "%s · Tamurt Transport" },
  description: "Tamurt Transport connecte les expéditeurs et les voyageurs pour faciliter l'envoi de colis entre la France et l'Algérie.",
  applicationName: "Tamurt Transport",
  openGraph: { type: "website", locale: "fr_FR", siteName: "Tamurt Transport" },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#141312" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="fr" dir="ltr" suppressHydrationWarning className={`${signika.variable} ${noto.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow">
          Aller au contenu
        </a>
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
