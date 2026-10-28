import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchResults } from "@/components/marketplace/search-results";
import { CardGridSkeleton } from "@/components/marketplace/cards";

export const metadata: Metadata = { title: "Trajets disponibles", description: "Voyageurs entre la France et l'Algérie disposant de place pour vos colis.", alternates: { canonical: "/trajets" } };

export default async function TripsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  return (
    <div className="container-page grid gap-6 py-8">
      <div className="grid gap-1"><h1 className="text-3xl font-bold">Trajets disponibles</h1><p className="text-muted-foreground">Des voyageurs qui ont de la place dans leurs bagages ou leur véhicule.</p></div>
      <Suspense key={JSON.stringify(raw)} fallback={<CardGridSkeleton />}><SearchResults raw={raw} forcedMode="trajets" /></Suspense>
    </div>
  );
}
