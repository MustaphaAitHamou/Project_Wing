import { Info, TriangleAlert } from "lucide-react";
import { getSetting } from "@/server/settings";
import { usesLocalSandbox } from "@/lib/env";

/** Bandeau d'information (configurable en admin) + avertissement permanent en mode simulateur. */
export async function SiteBanner() {
  const banner = await getSetting("site.banner");
  return (
    <>
      {usesLocalSandbox && (
        <div className="bg-warning-soft px-4 py-1.5 text-center text-xs font-medium text-foreground">
          <TriangleAlert className="mr-1 inline size-3.5 align-[-2px] text-warning" aria-hidden />
          Environnement de test : paiements et vérifications d&apos;identité simulés, aucun débit réel.
        </div>
      )}
      {banner.enabled && banner.message && (
        <div className={banner.tone === "warning" ? "bg-warning-soft px-4 py-2 text-center text-sm" : "bg-primary-soft px-4 py-2 text-center text-sm text-primary-soft-foreground"}>
          <Info className="mr-1.5 inline size-4 align-[-3px]" aria-hidden />
          {banner.message}
        </div>
      )}
    </>
  );
}
