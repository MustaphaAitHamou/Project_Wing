"use client";
import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { useAction } from "@/lib/hooks/use-action";

type Result = { ok: true; data: unknown } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Bouton générique d'administration : exécute une Server Action (passée par le
 * composant serveur) avec confirmation et motif si demandé.
 */
export function RunAction({ fn, payload, label, success = "Action effectuée", confirm, reason, variant = "outline", size = "sm", destructive }: {
  fn: (input: never) => Promise<Result>;
  payload: Record<string, unknown>;
  label: React.ReactNode;
  success?: string;
  confirm?: string;
  reason?: boolean;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  destructive?: boolean;
}) {
  const a = useAction(fn as unknown as (i: Record<string, unknown>) => Promise<Result>, { success });
  if (confirm || reason)
    return <ConfirmAction label={label} title={confirm ?? "Confirmer l'action"} variant={variant} size={size} destructive={destructive} reason={reason ? { label: "Motif (journalisé)", required: true } : undefined} onConfirm={(r) => a.run(reason ? { ...payload, reason: r } : payload)} />;
  return <Button variant={variant} size={size} loading={a.pending} onClick={() => a.run(payload)}>{label}</Button>;
}
