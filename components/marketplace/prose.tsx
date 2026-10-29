import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProsePage({ title, intro, children, updated, draftLegal }: { title: string; intro?: string; children: React.ReactNode; updated?: string; draftLegal?: boolean }) {
  return (
    <article className="container-page grid max-w-3xl gap-6 py-10 sm:py-14">
      <header className="grid gap-3">
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {intro && <p className="text-lg text-muted-foreground">{intro}</p>}
        {updated && <p className="text-xs text-muted-foreground">Dernière mise à jour : {updated}</p>}
      </header>
      {draftLegal && (
        <div role="note" className="flex gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
          <p><strong>Document de travail non validé juridiquement.</strong> Sa structure est prête, mais les passages signalés « [À VALIDER] » doivent être relus et complétés par un professionnel du droit avant le lancement commercial.</p>
        </div>
      )}
      {/* Styles de texte riche : les liens stylés en bouton (data-slot="button") gardent leur apparence. */}
      <div className={cn("grid gap-4 leading-relaxed [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1.5 [&_ul]:pl-6 [&_ol]:grid [&_ol]:list-decimal [&_ol]:gap-1.5 [&_ol]:pl-6 [&_a:not([data-slot=button])]:font-medium [&_a:not([data-slot=button])]:text-primary [&_a:not([data-slot=button])]:underline [&_mark]:rounded [&_mark]:bg-warning-soft [&_mark]:px-1 [&_mark]:text-foreground")}>{children}</div>
    </article>
  );
}

export const TODO = ({ children }: { children: React.ReactNode }) => <mark>[À VALIDER] {children}</mark>;
