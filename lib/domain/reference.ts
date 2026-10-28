import { randomInt } from "node:crypto";
// Alphabet sans caractères ambigus (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function bookingReference(): string {
  let s = "TS-";
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(0, ALPHABET.length)];
  return s;
}
