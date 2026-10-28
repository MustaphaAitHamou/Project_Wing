import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (d: Date | string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) =>
  new Date(d).toLocaleDateString("fr-FR", { timeZone: "UTC", ...opts });

export const formatDateTime = (d: Date | string) =>
  new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("");

export const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

/** Intervalle [aujourd'hui - n jours, aujourd'hui] au format YYYY-MM-DD. */
export function dateRange(days: number) {
  const now = new Date();
  return { from: new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}
