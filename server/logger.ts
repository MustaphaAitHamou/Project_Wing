/**
 * Journalisation structurée (JSON sur stdout, collectée par l'hébergeur).
 * Les clés sensibles sont masquées avant écriture.
 */
const SENSITIVE = /pass|secret|token|otp|code|authorization|cookie|phone|iban/i;

function redact(v: unknown, depth = 0): unknown {
  if (depth > 4 || v == null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map((x) => redact(x, depth + 1));
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SENSITIVE.test(k) ? "[redacted]" : redact(x, depth + 1)]));
}

function write(level: "debug" | "info" | "warn" | "error", event: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test" && level !== "error") return;
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...(redact(data) as object) });
  if (level === "error") console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (e: string, d?: Record<string, unknown>) => write("debug", e, d),
  info: (e: string, d?: Record<string, unknown>) => write("info", e, d),
  warn: (e: string, d?: Record<string, unknown>) => write("warn", e, d),
  error: (e: string, d?: Record<string, unknown>) => write("error", e, d),
};
