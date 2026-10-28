"use client";
import * as React from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => console.error(error), [error]);
  return (
    <main id="contenu" className="container-page grid min-h-[60dvh] place-content-center justify-items-center gap-4 py-16 text-center">
      <TriangleAlert className="size-12 text-destructive" aria-hidden />
      <p className="text-sm font-semibold text-muted-foreground">Erreur 500</p>
      <h1 className="text-3xl font-bold">Une erreur est survenue</h1>
      <p className="max-w-md text-muted-foreground">Nos équipes ont été prévenues. Réessayez dans un instant.{error.digest ? ` Référence : ${error.digest}` : ""}</p>
      <div className="flex gap-2"><Button onClick={reset}>Réessayer</Button><Button asChild variant="outline"><Link href="/">Accueil</Link></Button></div>
    </main>
  );
}
