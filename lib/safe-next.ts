/** N'accepte que des chemins internes pour éviter les redirections ouvertes. */
export function safeNext(n: string | string[] | undefined | null, fallback = "/tableau-de-bord") {
  const v = Array.isArray(n) ? n[0] : n;
  return v && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}
