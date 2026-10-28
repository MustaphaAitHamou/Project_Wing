import * as React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn, initials } from "@/lib/utils";

export function Skeleton({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} aria-hidden {...p} />;
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn("border-t border-border", className)} />;
}

const alertTones = {
  info: { cls: "bg-primary-soft text-primary-soft-foreground border-primary/20", Icon: Info },
  success: { cls: "bg-success-soft text-success border-success/25", Icon: CheckCircle2 },
  warning: { cls: "bg-warning-soft text-[color:var(--foreground)] border-warning/30", Icon: TriangleAlert },
  danger: { cls: "bg-destructive-soft text-destructive border-destructive/25", Icon: AlertCircle },
};

export function Alert({ tone = "info", title, children, className, action }: { tone?: keyof typeof alertTones; title?: string; children?: React.ReactNode; className?: string; action?: React.ReactNode }) {
  const { cls, Icon } = alertTones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border p-4 text-sm", cls, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="grid min-w-0 flex-1 gap-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed [&_a]:underline">{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft font-semibold text-primary-soft-foreground", className)} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {src ? <img src={src} alt="" className="size-full object-cover" /> : initials(name) || "?"}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: React.ComponentType<{ className?: string }>; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center", className)}>
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
        <Icon className="size-6" />
      </span>
      <div className="grid gap-1">
        <p className="font-semibold">{title}</p>
        {description && <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: string; actions?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid min-w-0 gap-1">
        {eyebrow}
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stars({ value, count, className }: { value: number | null; count?: number; className?: string }) {
  if (!value) return <span className={cn("text-xs text-muted-foreground", className)}>Pas encore d&apos;avis</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)} aria-label={`Note ${value.toFixed(1)} sur 5${count ? `, ${count} avis` : ""}`}>
      <svg viewBox="0 0 20 20" className="size-4 fill-accent" aria-hidden><path d="M10 1.5l2.6 5.5 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L1.4 7.7l6-.7z" /></svg>
      <span className="font-semibold tabular">{value.toFixed(1)}</span>
      {count != null && <span className="text-muted-foreground">({count})</span>}
    </span>
  );
}
