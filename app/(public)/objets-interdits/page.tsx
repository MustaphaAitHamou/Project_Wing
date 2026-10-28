import type { Metadata } from "next";
import { db } from "@/server/db/client";
import { ProsePage, TODO } from "@/components/marketplace/prose";
import { TRANSPORT_MODE_LABELS } from "@/features/shared/schemas";

export const metadata: Metadata = { title: "Objets interdits et réglementés", description: "Ce qui ne peut pas être envoyé avec Tamurt Sending.", alternates: { canonical: "/objets-interdits" } };

export default async function ProhibitedPage() {
  const cats = await db.parcelCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  const prohibited = cats.filter((c) => c.isProhibited);
  const regulated = cats.filter((c) => !c.isProhibited && (c.requiresReview || c.allowedModes.length > 0));
  return (
    <ProsePage title="Objets interdits et réglementés" intro="Ces règles protègent les voyageurs, les expéditeurs et les destinataires. Leur non-respect entraîne la suspension du compte et peut engager votre responsabilité pénale." draftLegal>
      <h2>Strictement interdits sur la plateforme</h2>
      <ul>{prohibited.map((c) => <li key={c.id}><strong>{c.name}</strong>{c.description ? ` : ${c.description}` : ""}</li>)}</ul>
      <p>Ainsi que tout objet dont l&apos;importation, l&apos;exportation ou le transport est interdit dans l&apos;un des pays concernés ou par le transporteur utilisé (compagnie aérienne, compagnie maritime).</p>
      <h2>Réglementés : validation ou conditions particulières</h2>
      <ul>{regulated.map((c) => <li key={c.id}><strong>{c.name}</strong>{c.description ? ` : ${c.description}` : ""}{c.allowedModes.length ? ` Moyens autorisés : ${c.allowedModes.map((m) => TRANSPORT_MODE_LABELS[m]).join(", ")}.` : ""}</li>)}</ul>
      <h2>Règles douanières France–Algérie</h2>
      <p><TODO>Franchises, quantités autorisées, produits soumis à déclaration ou à licence, obligations de déclaration de contenu. Ces règles doivent être établies à partir des sources officielles (douane.gouv.fr, douane.gov.dz) et vérifiées par un professionnel avant l&apos;ouverture commerciale.</TODO></p>
      <h2>Règles de transport aérien</h2>
      <p>Les compagnies aériennes limitent notamment les liquides, les batteries au lithium et les objets tranchants. Le voyageur doit respecter les règles de sa compagnie et peut refuser tout objet qu&apos;il ne peut pas transporter légalement.</p>
    </ProsePage>
  );
}
