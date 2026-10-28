import { notFound } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { isTestMode } from "@/lib/test-mode";

/** Outils de simulation : inaccessibles en production. */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (!isTestMode()) notFound();
  return (
    <>
      <SiteHeader />
      <main id="contenu" className="container-page grid max-w-2xl gap-6 py-10">
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
          <p><strong>Simulateur de développement.</strong> Cette page imite le service d&apos;un prestataire externe pour les tests. Aucune transaction ni vérification réelle n&apos;a lieu.</p>
        </div>
        {children}
      </main>
    </>
  );
}
