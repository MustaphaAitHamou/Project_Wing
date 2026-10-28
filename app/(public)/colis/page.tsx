import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchResults } from "@/components/marketplace/search-results";
import { CardGridSkeleton } from "@/components/marketplace/cards";

export const metadata: Metadata = { title: "Colis à transporter", description: "Colis à transporter entre la France et l'Algérie : rentabilisez votre voyage.", alternates: { canonical: "/colis" } };

export default async function ParcelsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  return (
    <div className="container-page grid gap-6 py-8">
      <div className="grid gap-1"><h1 className="text-3xl font-bold">Colis à transporter</h1><p className="text-muted-foreground">Des expéditeurs cherchent un voyageur pour leur colis. Proposez vos services.</p></div>
      <Suspense key={JSON.stringify(raw)} fallback={<CardGridSkeleton />}><SearchResults raw={raw} forcedMode="colis" /></Suspense>
    </div>
  );
}
