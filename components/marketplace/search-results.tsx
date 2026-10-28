import Link from "next/link";
import { SearchX } from "lucide-react";
import { searchParcels, searchParamsSchema, searchTrips, nearbySuggestions } from "@/server/services/search";
import { db } from "@/server/db/client";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ParcelCard, TripCard } from "./cards";
import { SearchForm } from "./search-form";
import { SearchFilters } from "./search-filters";
import { Pagination } from "./pagination";

export async function SearchResults({ raw, forcedMode }: { raw: Record<string, string | string[] | undefined>; forcedMode?: "trajets" | "colis" }) {
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const p = searchParamsSchema.parse({ ...flat, ...(forcedMode ? { mode: forcedMode } : {}) });
  const [res, categories] = await Promise.all([p.mode === "colis" ? searchParcels(p) : searchTrips(p), db.parcelCategory.findMany({ where: { isActive: true, isProhibited: false }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } })]);
  const suggestions = res.total === 0 ? await nearbySuggestions(p, res.fromCity?.countryCode ?? p.fromCountry, res.toCity?.countryCode ?? p.toCountry) : [];
  const toOpt = (c: typeof res.fromCity) => (c ? { id: c.id, name: c.name, slug: c.slug, countryCode: c.countryCode, countryName: c.country.name } : null);
  const label = p.mode === "colis" ? "colis à transporter" : "trajets";
  const unknownCity = (p.from && !res.fromCity) || (p.to && !res.toCity);

  return (
    <div className="grid gap-6">
      <SearchForm variant="compact" initial={{ mode: p.mode, from: toOpt(res.fromCity), to: toOpt(res.toCity), date: p.date }} />
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside><SearchFilters mode={p.mode} categories={categories} /></aside>
        <section aria-live="polite" className="grid content-start gap-4">
          <p className="text-sm text-muted-foreground"><strong className="text-foreground tabular">{res.total}</strong> {label}{res.fromCity ? ` au départ de ${res.fromCity.name}` : ""}{res.toCity ? ` vers ${res.toCity.name}` : ""}</p>
          {unknownCity && <p className="text-sm text-warning">Ville non reconnue : seules les villes des pays ouverts sont proposées. Choisissez une ville dans la liste.</p>}
          {res.total === 0 ? (
            <>
              <EmptyState icon={SearchX} title={`Aucun ${p.mode === "colis" ? "colis" : "trajet"} ne correspond`} description={p.mode === "colis" ? "Élargissez les dates ou publiez votre trajet : les expéditeurs compatibles seront prévenus." : "Élargissez les dates ou publiez votre colis : les voyageurs compatibles seront prévenus dès qu'ils publient leur trajet."} action={<Button asChild><Link href={p.mode === "colis" ? "/tableau-de-bord/trajets/nouveau" : "/tableau-de-bord/colis/nouveau"}>{p.mode === "colis" ? "Publier mon trajet" : "Publier mon colis"}</Link></Button>} />
              {suggestions.length > 0 && (
                <div className="grid gap-3">
                  <h2 className="text-lg font-semibold">Suggestions proches (mêmes pays, autres villes ou dates)</h2>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{suggestions.map((s) => ("pricePerKg" in s ? <TripCard key={s.id} trip={s} /> : <ParcelCard key={s.id} parcel={s} />))}</div>
                </div>
              )}
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {res.items.map((it) => ("pricePerKg" in it ? <TripCard key={it.id} trip={it} /> : <ParcelCard key={it.id} parcel={it} />))}
            </div>
          )}
          <Pagination page={res.page} total={res.total} pageSize={res.pageSize} params={flat} />
        </section>
      </div>
    </div>
  );
}
