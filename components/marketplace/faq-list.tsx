import { ChevronDown } from "lucide-react";

export function FaqList({ items }: { items: { id: string; question: string; answer: string }[] }) {
  return (
    <div className="grid gap-2">
      {items.map((f) => (
        <details key={f.id} className="group rounded-xl border bg-card px-5 py-4 open:shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
            {f.question}
            <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}
