"use client";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function ResendVerification({ email }: { email: string }) {
  const [pending, setPending] = React.useState(false);
  return (
    <Button
      variant="outline"
      loading={pending}
      onClick={async () => {
        setPending(true);
        const res = await authClient.sendVerificationEmail({ email, callbackURL: "/tableau-de-bord?bienvenue=1" });
        setPending(false);
        if (res.error) toast.error(res.error.status === 429 ? "Trop de demandes, réessayez plus tard." : "Envoi impossible pour le moment.");
        else toast.success("Un nouveau lien vient d'être envoyé.");
      }}
    >
      Renvoyer le lien
    </Button>
  );
}
