import { cn } from "@/lib/utils";

/**
 * Logo provisoire Tamurt Sending : un colis dont l'arête dessine un trajet en arc,
 * ponctué d'un losange inspiré des motifs kabyles. Modifiable ici (SVG pur, couleurs thème).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <rect x="2" y="2" width="36" height="36" rx="11" fill="var(--primary)" />
      <path d="M11 26.5c3.5-8 14.5-8 18 0" fill="none" stroke="var(--primary-foreground)" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="0.1 5.2" />
      <path d="M11 15.5l9-4.5 9 4.5-9 4.5z" fill="var(--primary-foreground)" />
      <path d="M11 15.5v6l9 4.5v-6zM29 15.5v6l-9 4.5v-6z" fill="var(--primary-foreground)" opacity=".72" />
      <path d="M20 29.2l2.2 2.2-2.2 2.2-2.2-2.2z" fill="var(--accent)" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="font-display text-[1.05rem] font-extrabold leading-none tracking-tight">
          Tamurt<span className="text-primary"> Sending</span>
        </span>
      )}
    </span>
  );
}
