import "server-only";
import { z } from "zod";
import { AppError } from "./errors";
import { logger } from "@/server/logger";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Enveloppe commune des Server Actions : validation Zod du payload, traduction
 * des erreurs métier, journalisation des erreurs inattendues sans fuite d'information.
 */
export function action<S extends z.ZodType, T>(schema: S, fn: (input: z.output<S>) => Promise<T>) {
  return async (raw: z.input<S>): Promise<ActionResult<T>> => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const i of parsed.error.issues) (fieldErrors[i.path.join(".") || "_"] ??= []).push(i.message);
      return { ok: false, error: "Certains champs sont invalides.", fieldErrors };
    }
    try {
      return { ok: true, data: await fn(parsed.data) };
    } catch (e) {
      return toActionError(e);
    }
  };
}

export function toActionError(e: unknown): { ok: false; error: string; fieldErrors?: Record<string, string[]> } {
  if (e instanceof AppError) return { ok: false, error: e.message, fieldErrors: e.fieldErrors };
  // Les redirections Next.js doivent être relancées.
  if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
  logger.error("action.unexpected", { error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : undefined });
  return { ok: false, error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
}
