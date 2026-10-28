import { requireUserPage } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/utils";

/** Boîte de réception de développement : emails du mode outbox adressés à l'utilisateur connecté. */
export default async function MailboxPage() {
  const user = await requireUserPage("/dev/mailbox");
  if (env.EMAIL_PROVIDER !== "outbox") return <p>Les emails sont envoyés par le prestataire configuré.</p>;
  const isStaff = user.role === "ADMIN";
  const mails = await db.emailLog.findMany({ where: isStaff ? {} : { to: user.email }, orderBy: { createdAt: "desc" }, take: 30 });
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">Emails (mode développement)</h1>
      {mails.length === 0 && <p className="text-sm text-muted-foreground">Aucun email.</p>}
      {mails.map((m) => (
        <details key={m.id} className="rounded-xl border bg-card p-4">
          <summary className="cursor-pointer text-sm"><strong>{m.subject}</strong> · {m.to} · {formatDateTime(m.createdAt)}</summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs">{m.text}</pre>
        </details>
      ))}
    </div>
  );
}
