/**
 * Nettoie une saisie numérique au fil de la frappe : chiffres uniquement, plus un séparateur
 * décimal (« , » ou « . ») si `decimals` > 0, limité à `decimals` chiffres après la virgule.
 * Le serveur revalide toujours la valeur (schémas Zod).
 */
export function sanitizeNumeric(raw: string, decimals = 2): string {
  let out = "";
  let sep = false;
  let frac = 0;
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      if (sep) {
        if (frac >= decimals) continue;
        frac++;
      }
      out += ch;
    } else if ((ch === "," || ch === ".") && decimals > 0 && !sep) {
      sep = true;
      out += out ? ch : `0${ch}`;
    }
  }
  return out;
}
