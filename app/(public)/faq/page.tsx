import type { Metadata } from "next";
import { db } from "@/server/db/client";
import { ProsePage } from "@/components/marketplace/prose";
import { FaqList } from "@/components/marketplace/faq-list";

export const metadata: Metadata = { title: "Questions fréquentes", description: "Toutes les réponses sur l'envoi et le transport de colis avec Tamurt Sending.", alternates: { canonical: "/faq" } };
const CATS: Record<string, string> = { general: "Général", expediteur: "Expéditeurs", voyageur: "Voyageurs", securite: "Sécurité" };

export default async function FaqPage() {
  const items = await db.faqItem.findMany({ where: { isPublished: true }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  const groups = Object.entries(CATS).map(([k, label]) => ({ label, items: items.filter((i) => i.category === k) })).filter((g) => g.items.length);
  const others = items.filter((i) => !(i.category in CATS));
  const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((i) => ({ "@type": "Question", name: i.question, acceptedAnswer: { "@type": "Answer", text: i.answer } })) };
  return (
    <ProsePage title="Questions fréquentes">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {[...groups, ...(others.length ? [{ label: "Autres", items: others }] : [])].map((g) => (
        <section key={g.label} className="grid gap-3"><h2>{g.label}</h2><FaqList items={g.items} /></section>
      ))}
    </ProsePage>
  );
}
