import type { Metadata } from "next";
import { ProsePage } from "@/components/marketplace/prose";
import { ContactForm } from "@/features/contact/contact-form";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Contact", description: "Contactez l'équipe Tamurt Sending.", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const user = await getCurrentUser();
  return (
    <ProsePage title="Nous contacter" intro="Une question, un problème avec une réservation, une suggestion ? Écrivez-nous. Pour un problème sur une réservation en cours, ouvrez plutôt un litige depuis la réservation : il sera traité en priorité.">
      <ContactForm defaultName={user ? `${user.firstName} ${user.lastName}` : ""} defaultEmail={user?.email ?? ""} />
    </ProsePage>
  );
}
