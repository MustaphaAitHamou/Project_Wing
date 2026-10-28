import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { requireUserPage } from "@/server/auth/session";
import { ScanConfirm } from "@/features/bookings/scan-confirm";

export const metadata: Metadata = { title: "Confirmer une remise", robots: { index: false } };

/** Cible du QR code. Le jeton est dans le fragment d'URL (#…) : il n'est jamais envoyé au serveur dans la requête ni journalisé. */
export default async function ScanPage({ searchParams }: { searchParams: Promise<{ b?: string; p?: string }> }) {
  const { b, p } = await searchParams;
  await requireUserPage(`/scan?b=${b ?? ""}&p=${p ?? ""}`);
  return (
    <>
      <SiteHeader />
      <main id="contenu" className="container-page grid max-w-md gap-6 py-12">
        <ScanConfirm bookingId={b ?? ""} purpose={p === "DELIVERY" ? "DELIVERY" : "PICKUP"} />
      </main>
    </>
  );
}
