import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, Paperclip } from "lucide-react";
import { requireUserPage } from "@/server/auth/session";
import { listConversations } from "@/server/services/messaging";
import { Avatar, EmptyState, PageHeader } from "@/components/ui/misc";
import { formatDateTime, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUserPage("/tableau-de-bord/messages");
  const convs = await listConversations(user.id);
  return (
    <div className="grid gap-6">
      <PageHeader title="Messages" description="Vos échanges avec les voyageurs et les expéditeurs. Une conversation est créée à chaque proposition." />
      {convs.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Aucune conversation" description="Envoyez une proposition ou une demande pour démarrer un échange." />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {convs.map((c) => (
            <li key={c.id}>
              <Link href={`/tableau-de-bord/messages/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-muted/50">
                <Avatar name={c.other?.name ?? "?"} src={c.other?.image} />
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("truncate", c.unread ? "font-bold" : "font-medium")}>{c.other?.name}{c.parcelTitle && <span className="font-normal text-muted-foreground"> · {c.parcelTitle}</span>}</span>
                    {c.lastMessage && <time className="shrink-0 text-xs text-muted-foreground">{formatDateTime(c.lastMessage.at)}</time>}
                  </div>
                  <span className={cn("flex items-center gap-1 truncate text-sm", c.unread ? "text-foreground" : "text-muted-foreground")}>
                    {c.lastMessage ? <>{c.lastMessage.mine && "Vous : "}{c.lastMessage.hasAttachment && <Paperclip className="size-3.5" aria-label="Pièce jointe" />}{c.lastMessage.body}</> : "Aucun message"}
                  </span>
                </div>
                {c.unread && <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-label="Non lu" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
