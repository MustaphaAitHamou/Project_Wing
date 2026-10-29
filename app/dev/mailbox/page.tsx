import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

/**
 * Boîte de réception de développement (mode outbox, environnements de test uniquement : voir le layout).
 * Accessible sans connexion, sinon le lien de confirmation d'un compte non vérifié serait introuvable.
 */
export default async function MailboxPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  if (env.EMAIL_PROVIDER !== "outbox") return <p>Les emails sont envoyés par le prestataire configuré.</p>;
  const user = await getCurrentUser();
  const isStaff = user?.role === "ADMIN";
  const email = ((await searchParams).email ?? user?.email ?? "").trim().toLowerCase();
  const mails = isStaff || email ? await db.emailLog.findMany({ where: isStaff && !email ? {} : { to: email }, orderBy: { createdAt: "desc" }, take: 30 }) : [];
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">Emails (mode développement)</h1>
      <form className="flex flex-wrap items-end gap-2">
        <Field id="mailbox-email" label="Adresse email" className="min-w-0 flex-1"><Input type="email" name="email" defaultValue={email} placeholder="vous@exemple.fr" required /></Field>
        <Button type="submit" variant="outline">Afficher</Button>
      </form>
      {(email || isStaff) && mails.length === 0 && <p className="text-sm text-muted-foreground">Aucun email.</p>}
      {mails.map((m) => (
        <details key={m.id} className="rounded-xl border bg-card p-4" open={mails.length === 1}>
          <summary className="cursor-pointer text-sm"><strong>{m.subject}</strong> · {m.to} · {formatDateTime(m.createdAt)}</summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs">{m.text}</pre>
        </details>
      ))}
    </div>
  );
}
