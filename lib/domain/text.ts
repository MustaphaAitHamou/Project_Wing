/** Normalise un nom pour la recherche : minuscules, sans accents ni ponctuation. "Béjaïa" → "bejaia". */
export function normalizeSearch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`-]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(input: string): string {
  return normalizeSearch(input).replace(/ /g, "-");
}
