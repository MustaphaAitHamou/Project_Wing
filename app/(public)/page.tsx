import Link from "next/link";
import { ArrowRight, BadgeCheck, HandCoins, KeyRound, MessagesSquare, PackageCheck, PackageSearch, ScanLine, ShieldCheck, Sparkles, Truck, UserRoundCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, Stars } from "@/components/ui/misc";
import { SearchForm } from "@/components/marketplace/search-form";
import { ParcelCard, TripCard } from "@/components/marketplace/cards";
import { HeroIllustration } from "@/components/marketplace/hero-illustration";
import { latestParcels, latestTrips, popularDestinations } from "@/server/services/search";
import { getOpenCorridors } from "@/server/services/geo";
import { db } from "@/server/db/client";
import { FaqList } from "@/components/marketplace/faq-list";

const steps = [
  { icon: PackageSearch, title: "Publiez votre colis", text: "Indiquez le trajet, le poids, les dimensions, le contenu et votre budget. Vos coordonnées restent privées." },
  { icon: Users, title: "Choisissez un voyageur", text: "Recevez des propositions de voyageurs qui font déjà le trajet, comparez profils, avis et tarifs." },
  { icon: KeyRound, title: "Remettez avec un code", text: "Le paiement est sécurisé en ligne. Vous remettez le colis en main propre et donnez votre code de remise." },
  { icon: PackageCheck, title: "Livraison confirmée", text: "Le destinataire donne son propre code à la réception. Le voyageur est rémunéré après confirmation." },
];

const reasons = [
  { icon: HandCoins, title: "Moins cher qu'un transporteur", text: "Vous profitez de la place disponible dans les bagages de quelqu'un qui part déjà." },
  { icon: MessagesSquare, title: "Un contact direct", text: "Messagerie intégrée pour organiser la remise sans partager votre numéro trop tôt." },
  { icon: ScanLine, title: "Chaque étape prouvée", text: "Codes à usage unique et QR code pour la remise et la livraison, horodatés dans le suivi." },
  { icon: Truck, title: "Avion, voiture ou ferry", text: "Des voyageurs aux profils variés, avec des capacités et des dates clairement affichées." },
];

export default async function HomePage() {
  const [trips, parcels, destinations, corridors, reviews, faq] = await Promise.all([
    latestTrips(6),
    latestParcels(6),
    popularDestinations(6),
    getOpenCorridors(),
    db.review.findMany({ where: { status: "VISIBLE", rating: { gte: 4 }, comment: { not: null } }, orderBy: { createdAt: "desc" }, take: 3, include: { author: { select: { firstName: true } } } }),
    db.faqItem.findMany({ where: { isPublished: true }, orderBy: { sortOrder: "asc" }, take: 5 }),
  ]);
  const jsonLd = { "@context": "https://schema.org", "@type": "Organization", name: "Tamurt Sending", parentOrganization: { "@type": "Organization", name: "Tamurt Services" }, url: process.env.APP_URL };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-[radial-gradient(60rem_30rem_at_80%_-10%,var(--primary-soft),transparent)]">
        <div className="container-page grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-7">
            <div className="grid gap-4">
              <p className="inline-flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-semibold text-primary"><Sparkles className="size-3.5" aria-hidden />France ⇄ Algérie, et la Kabylie en priorité</p>
              <h1 className="text-[2.15rem] font-extrabold leading-[1.08] sm:text-5xl lg:text-[3.4rem]">
                Envoyez vos colis grâce aux voyageurs qui font <span className="text-primary">déjà le trajet</span>.
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                Tamurt Sending connecte les expéditeurs et les voyageurs pour faciliter l&apos;envoi de colis entre la France et l&apos;Algérie.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/tableau-de-bord/colis/nouveau">Envoyer un colis<ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/tableau-de-bord/trajets/nouveau">Proposer un trajet</Link></Button>
            </div>
          </div>
          <HeroIllustration className="mx-auto hidden w-full max-w-md lg:block" />
        </div>
        <div className="container-page pb-12">
          <SearchForm />
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="container-page py-16 md:py-20" aria-labelledby="how">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="grid gap-2">
            <h2 id="how" className="text-3xl font-bold">Comment fonctionne Tamurt Sending</h2>
            <p className="max-w-xl text-muted-foreground">Quatre étapes, du dépôt de l&apos;annonce à la livraison confirmée.</p>
          </div>
          <Button asChild variant="link"><Link href="/comment-ca-marche">Tout comprendre<ArrowRight /></Link></Button>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="relative grid content-start gap-3 rounded-xl border bg-card p-5">
              <span className="text-xs font-bold tabular text-muted-foreground">Étape {i + 1}</span>
              <s.icon className="size-7 text-primary" aria-hidden />
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Derniers trajets */}
      <section className="border-y bg-card/60 py-16" aria-labelledby="latest-trips">
        <div className="container-page grid gap-8">
          <div className="flex items-end justify-between gap-4">
            <h2 id="latest-trips" className="text-2xl font-bold sm:text-3xl">Derniers trajets disponibles</h2>
            <Button asChild variant="link"><Link href="/trajets">Voir tous les trajets<ArrowRight /></Link></Button>
          </div>
          {trips.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{trips.map((t) => <TripCard key={t.id} trip={t} />)}</div>
          ) : (
            <EmptyState icon={Truck} title="Aucun trajet publié pour le moment" description="Vous voyagez bientôt ? Publiez votre trajet et soyez le premier à recevoir des demandes." action={<Button asChild><Link href="/tableau-de-bord/trajets/nouveau">Publier un trajet</Link></Button>} />
          )}
        </div>
      </section>

      {/* Dernières demandes */}
      <section className="container-page grid gap-8 py-16" aria-labelledby="latest-parcels">
        <div className="flex items-end justify-between gap-4">
          <h2 id="latest-parcels" className="text-2xl font-bold sm:text-3xl">Dernières demandes d&apos;expédition</h2>
          <Button asChild variant="link"><Link href="/colis">Voir tous les colis<ArrowRight /></Link></Button>
        </div>
        {parcels.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{parcels.map((p) => <ParcelCard key={p.id} parcel={p} />)}</div>
        ) : (
          <EmptyState icon={PackageSearch} title="Aucune demande publiée pour le moment" description="Publiez votre colis : les voyageurs compatibles sont prévenus automatiquement." action={<Button asChild><Link href="/tableau-de-bord/colis/nouveau">Envoyer un colis</Link></Button>} />
        )}
      </section>

      {/* Destinations */}
      <section className="container-page grid gap-6 pb-16" aria-labelledby="destinations">
        <h2 id="destinations" className="text-2xl font-bold sm:text-3xl">{destinations.length ? "Destinations populaires" : "Destinations desservies"}</h2>
        <div className="flex flex-wrap gap-2">
          {destinations.length
            ? destinations.map((d) => (
                <Link key={d.id} href={`/rechercher?mode=trajets&to=${d.slug}`} className="rounded-full border bg-card px-4 py-2 text-sm font-medium hover:border-primary/50">
                  {d.name} <span className="text-muted-foreground">· {d.countryName} · {Number(d.n)} annonce{Number(d.n) > 1 ? "s" : ""}</span>
                </Link>
              ))
            : corridors.map((c) => (
                <span key={c.id} className="rounded-full border bg-card px-4 py-2 text-sm font-medium">{c.origin.name} → {c.destination.name}</span>
              ))}
        </div>
      </section>

      {/* Pourquoi */}
      <section className="border-y bg-primary-soft/50 py-16" aria-labelledby="why">
        <div className="container-page grid gap-10">
          <h2 id="why" className="text-2xl font-bold sm:text-3xl">Pourquoi choisir Tamurt Sending</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map((r) => (
              <div key={r.title} className="grid content-start gap-2">
                <r.icon className="size-6 text-primary" aria-hidden />
                <h3 className="font-semibold">{r.title}</h3>
                <p className="text-sm text-muted-foreground">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sécurité */}
      <section className="container-page grid items-center gap-10 py-16 md:grid-cols-2" aria-labelledby="trust">
        <div className="grid gap-4">
          <h2 id="trust" className="text-2xl font-bold sm:text-3xl">Sécurité et vérification des utilisateurs</h2>
          <p className="text-muted-foreground">Nous ne promettons pas l&apos;impossible : voici précisément ce que la plateforme fait pour sécuriser chaque envoi.</p>
          <ul className="grid gap-3">
            {[
              [UserRoundCheck, "Identité des voyageurs vérifiée par un prestataire spécialisé avant tout transport."],
              [ShieldCheck, "Paiement en ligne via un prestataire agréé ; le voyageur est rémunéré après la livraison confirmée."],
              [KeyRound, "Deux codes à usage unique : un pour la remise, un pour la livraison."],
              [BadgeCheck, "Avis uniquement après une transaction réellement terminée."],
            ].map(([Icon, text]) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <li key={text as string} className="flex gap-3 text-sm"><I className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /><span>{text as string}</span></li>
              );
            })}
          </ul>
          <Button asChild variant="outline" className="w-fit"><Link href="/securite">Notre approche de la sécurité</Link></Button>
        </div>
        <div className="grid gap-3 rounded-2xl border bg-card p-6">
          <p className="text-sm font-semibold">Ce que nous ne proposons pas (encore)</p>
          <p className="text-sm text-muted-foreground">Aucune assurance n&apos;est incluse à ce jour. Les objets de valeur, interdits ou réglementés ne doivent pas être confiés. Consultez la liste des <Link href="/objets-interdits" className="font-medium text-primary underline">objets interdits</Link> avant de publier.</p>
        </div>
      </section>

      {/* Avis authentiques */}
      {reviews.length > 0 && (
        <section className="container-page grid gap-6 pb-16" aria-labelledby="reviews">
          <h2 id="reviews" className="text-2xl font-bold sm:text-3xl">Ils ont utilisé Tamurt Sending</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.id} className="grid gap-3 rounded-xl border bg-card p-5">
                <Stars value={r.rating} />
                <blockquote className="text-sm">« {r.comment} »</blockquote>
                <figcaption className="text-xs text-muted-foreground">{r.author.firstName}, après une transaction terminée</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="container-page grid gap-6 pb-16 md:grid-cols-[1fr_1.4fr]" aria-labelledby="faq">
        <div className="grid content-start gap-3">
          <h2 id="faq" className="text-2xl font-bold sm:text-3xl">Questions fréquentes</h2>
          <Button asChild variant="link" className="w-fit"><Link href="/faq">Toutes les questions<ArrowRight /></Link></Button>
        </div>
        <FaqList items={faq} />
      </section>

      {/* CTA */}
      <section className="container-page">
        <div className="grid gap-6 rounded-2xl bg-primary px-6 py-10 text-primary-foreground md:grid-cols-[1fr_auto] md:items-center md:px-10">
          <div className="grid gap-2">
            <h2 className="text-2xl font-bold sm:text-3xl">Un seul compte pour envoyer et transporter</h2>
            <p className="opacity-90">L&apos;inscription est gratuite. Vous ne payez qu&apos;une fois un voyageur choisi.</p>
          </div>
          <Button asChild size="lg" variant="accent"><Link href="/inscription">Créer mon compte</Link></Button>
        </div>
      </section>
    </>
  );
}
