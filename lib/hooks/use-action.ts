"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Result<T> = { ok: true; data: T; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Exécute une Server Action avec état de chargement, toast d'erreur/succès et rafraîchissement. */
export function useAction<I, T>(fn: (input: I) => Promise<Result<T>>, opts: { success?: string | ((d: T) => string); refresh?: boolean; onSuccess?: (d: T) => void } = {}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const run = React.useCallback(
    async (input: I) => {
      setPending(true);
      setFieldErrors({});
      try {
        const r = await fn(input);
        if (!r.ok) {
          setFieldErrors(r.fieldErrors ?? {});
          const first = r.fieldErrors ? Object.values(r.fieldErrors)[0]?.[0] : undefined;
          toast.error(r.error, first && first !== r.error ? { description: first } : undefined);
          return null;
        }
        if (opts.success) toast.success(typeof opts.success === "function" ? opts.success(r.data) : opts.success);
        opts.onSuccess?.(r.data);
        if (opts.refresh !== false) router.refresh();
        return r.data;
      } catch {
        toast.error("Connexion au serveur impossible. Vérifiez votre réseau et réessayez.");
        return null;
      } finally {
        setPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn, router],
  );
  return { run, pending, fieldErrors };
}
