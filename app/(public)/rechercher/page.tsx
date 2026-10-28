import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchResults } from "@/components/marketplace/search-results";
import { CardGridSkeleton } from "@/components/marketplace/cards";

export const metadata: Metadata = { title: "Rechercher un trajet ou un colis", description: "Trouvez un voyageur pour votre colis, ou un colis à transporter, entre la France et l'Algérie.", alternates: { canonical: "/rechercher" } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  return (
    <div className="container-page grid gap-6 py-8">
      <h1 className="text-3xl font-bold">Rechercher</h1>
      <Suspense key={JSON.stringify(raw)} fallback={<CardGridSkeleton />}><SearchResults raw={raw} /></Suspense>
    </div>
  );
}
