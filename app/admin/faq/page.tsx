import { db } from "@/server/db/client";
import { PageHeader } from "@/components/ui/misc";
import { FaqEditor } from "@/features/admin/faq-editor";

export default async function AdminFaq() {
  const items = await db.faqItem.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  return (
    <div className="grid gap-5">
      <PageHeader title="FAQ" description="Contenu affiché sur l'accueil et la page Questions fréquentes." />
      {items.map((f) => <FaqEditor key={f.id} item={f} />)}
      <FaqEditor item={null} />
    </div>
  );
}
