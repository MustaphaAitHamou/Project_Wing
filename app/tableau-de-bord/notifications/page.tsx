import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { requireUserPage } from "@/server/auth/session";
import { listNotifications } from "@/server/services/notifications";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { MarkAllRead } from "@/features/notifications/mark-all-read";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ apres?: string }> }) {
  const { apres } = await searchParams;
  const user = await requireUserPage("/tableau-de-bord/notifications");
  const { items, nextCursor } = await listNotifications(user.id, apres);
  return (
    <div className="grid gap-6">
      <PageHeader title="Notifications" actions={items.some((n) => !n.readAt) ? <MarkAllRead /> : null} />
      {items.length === 0 ? <EmptyState icon={Bell} title="Aucune notification" /> : (
        <ul className="divide-y rounded-xl border bg-card">
          {items.map((n) => (
            <li key={n.id} className={cn("grid gap-0.5 p-4", !n.readAt && "bg-primary-soft/40")}>
              <div className="flex items-start justify-between gap-3">
                {n.link ? <Link href={n.link} className={cn("hover:underline", !n.readAt ? "font-semibold" : "font-medium")}>{n.title}</Link> : <span className="font-medium">{n.title}</span>}
                <time className="shrink-0 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</time>
              </div>
              <p className="text-sm text-muted-foreground">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
      {nextCursor && <Link href={`?apres=${nextCursor}`} className="text-sm font-medium text-primary">Notifications plus anciennes →</Link>}
    </div>
  );
}
