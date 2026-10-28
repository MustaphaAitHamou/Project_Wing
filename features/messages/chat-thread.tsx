"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, CheckCheck, Flag, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, Alert } from "@/components/ui/misc";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { ReportDialog } from "@/features/reports/report-dialog";
import { useAction } from "@/lib/hooks/use-action";
import { cn } from "@/lib/utils";
import { blockUserAction, markReadAction, sendMessageAction } from "./actions";

type Conv = {
  id: string;
  parcel: { id: string; title: string } | null;
  booking: { id: string; reference: string; status: string } | null;
  other: { id: string; name: string; image: string | null } | null;
  blockedByMe: boolean;
  blockedByOther: boolean;
  messages: { id: string; body: string; hidden: boolean; mine: boolean; at: string; read: boolean; attachment: { url: string; name: string; mime: string } | null }[];
};

const time = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function ChatThread({ conv }: { conv: Conv }) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [sending, setSending] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const markRead = useAction(markReadAction, { refresh: false });
  const block = useAction(blockUserAction, { success: conv.blockedByMe ? "Utilisateur débloqué" : "Utilisateur bloqué" });

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
    void markRead.run({ id: conv.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv.messages.length, conv.id]);

  // Repli : rafraîchissement périodique si le flux temps réel est indisponible (proxy, réseau mobile).
  React.useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && router.refresh(), 20_000);
    return () => clearInterval(t);
  }, [router]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() && !file) return;
    setSending(true);
    const fd = new FormData();
    fd.set("conversationId", conv.id);
    fd.set("body", body);
    if (file) fd.set("file", file);
    const r = await sendMessageAction(fd);
    setSending(false);
    if (!r.ok) return toast.error(r.error);
    setBody("");
    setFile(null);
    router.refresh();
  };

  const disabled = conv.blockedByMe || conv.blockedByOther;
  const lastMine = [...conv.messages].reverse().find((m) => m.mine);

  return (
    <div className="flex h-[calc(100dvh-13rem)] min-h-[28rem] flex-col overflow-hidden rounded-2xl border bg-card lg:h-[calc(100dvh-9rem)]">
      <header className="flex items-center gap-3 border-b p-3">
        <Button asChild variant="ghost" size="icon" className="lg:hidden"><Link href="/tableau-de-bord/messages" aria-label="Retour aux conversations"><ArrowLeft /></Link></Button>
        <Avatar name={conv.other?.name ?? "?"} src={conv.other?.image} size={36} />
        <div className="grid min-w-0 flex-1">
          <span className="truncate font-semibold">{conv.other?.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {conv.booking ? <Link href={`/tableau-de-bord/reservations/${conv.booking.id}`} className="hover:underline">Réservation {conv.booking.reference}</Link> : conv.parcel?.title}
          </span>
        </div>
        <Dropdown>
          <DropdownTrigger asChild><Button variant="ghost" size="sm">Options</Button></DropdownTrigger>
          <DropdownContent>
            <DropdownItem onSelect={() => setReportOpen(true)}><Flag />Signaler cet utilisateur</DropdownItem>
            {conv.other && <DropdownItem onSelect={() => block.run({ userId: conv.other!.id, block: !conv.blockedByMe })}><Ban />{conv.blockedByMe ? "Débloquer" : "Bloquer"}</DropdownItem>}
          </DropdownContent>
        </Dropdown>
        {conv.other && <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="USER" targetId={conv.other.id} />}
      </header>

      <div className="flex-1 overflow-y-auto p-4" aria-live="polite" aria-label="Messages">
        <p className="mx-auto mb-4 max-w-md rounded-lg bg-muted px-3 py-2 text-center text-xs text-muted-foreground">Restez sur Tamurt Sending pour vos échanges et paiements. Ne partagez jamais vos codes de confirmation par message.</p>
        <ul className="grid gap-2">
          {conv.messages.map((m) => (
            <li key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2 text-sm sm:max-w-[70%]", m.mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted", m.hidden && "italic opacity-70")}>
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                {m.attachment && (
                  m.attachment.mime.startsWith("image/") ? (
                    <a href={m.attachment.url} target="_blank" rel="noreferrer"><img src={m.attachment.url} alt={m.attachment.name} className="mt-1 max-h-60 rounded-lg" /></a>
                  ) : <a href={m.attachment.url} className="mt-1 flex items-center gap-1 underline"><Paperclip className="size-3.5" />{m.attachment.name}</a>
                )}
                <p className={cn("mt-0.5 flex items-center justify-end gap-1 text-[10px]", m.mine ? "text-primary-foreground/75" : "text-muted-foreground")}>
                  {time(m.at)}
                  {m.mine && m.id === lastMine?.id && m.read && <CheckCheck className="size-3" aria-label="Lu" />}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div ref={bottomRef} />
      </div>

      {disabled ? (
        <div className="border-t p-3"><Alert tone="warning">{conv.blockedByMe ? "Vous avez bloqué cet utilisateur." : "Cet utilisateur ne peut plus recevoir vos messages."}</Alert></div>
      ) : (
        <form onSubmit={send} className="grid gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {file && <span className="flex w-fit items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs"><Paperclip className="size-3.5" />{file.name}<button type="button" onClick={() => setFile(null)} aria-label="Retirer la pièce jointe"><X className="size-3.5" /></button></span>}
          <div className="flex items-end gap-2">
            <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-muted" aria-label="Joindre une image ou un PDF">
              <Paperclip className="size-5 text-muted-foreground" />
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size > 10 * 1024 * 1024) toast.error("Fichier trop volumineux (10 Mo max)."); else setFile(f ?? null); e.target.value = ""; }} />
            </label>
            <label htmlFor="chat-body" className="sr-only">Votre message</label>
            <textarea
              id="chat-body"
              rows={1}
              value={body}
              maxLength={4000}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(e); } }}
              placeholder="Écrire un message…"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-base sm:text-sm"
            />
            <Button type="submit" size="icon" className="size-11" loading={sending} aria-label="Envoyer">{!sending && <Send />}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
