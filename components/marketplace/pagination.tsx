import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({ page, total, pageSize, params }: { page: number; total: number; pageSize: number; params: Record<string, string | undefined> }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const href = (p: number) => `?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v) as [string, string][]), page: String(p) })}`;
  const link = "inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-muted";
  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      {page > 1 ? <Link href={href(page - 1)} className={link} rel="prev"><ChevronLeft className="size-4" />Précédent</Link> : <span className={cn(link, "opacity-40")} aria-disabled><ChevronLeft className="size-4" />Précédent</span>}
      <span className="px-2 text-sm tabular text-muted-foreground">Page {page} / {pages}</span>
      {page < pages ? <Link href={href(page + 1)} className={link} rel="next">Suivant<ChevronRight className="size-4" /></Link> : <span className={cn(link, "opacity-40")} aria-disabled>Suivant<ChevronRight className="size-4" /></span>}
    </nav>
  );
}
