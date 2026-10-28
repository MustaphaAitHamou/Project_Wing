"use client";
import * as React from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { useAction } from "@/lib/hooks/use-action";
import { cn } from "@/lib/utils";
import { createReviewAction } from "./actions";

export function ReviewForm({ bookingId, subjectName }: { bookingId: string; subjectName: string }) {
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const r = useAction(createReviewAction, { success: "Merci pour votre avis" });
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void r.run({ bookingId, rating, comment }); }}>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Votre note pour {subjectName}</legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Note sur 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} étoile${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} className="rounded p-1 hover:bg-muted">
              <Star className={cn("size-7", n <= rating ? "fill-accent text-accent" : "text-muted-foreground")} />
            </button>
          ))}
        </div>
      </fieldset>
      <Field id="review-comment" label="Commentaire" optional><Textarea rows={3} value={comment} maxLength={1000} onChange={(e) => setComment(e.target.value)} /></Field>
      <Button type="submit" disabled={rating === 0} loading={r.pending} className="w-fit">Publier l&apos;avis</Button>
    </form>
  );
}
