import { createHmac } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { E2E_DATABASE_URL } from "../playwright.config";

export const pool = new Pool({ connectionString: E2E_DATABASE_URL, max: 3 });
export const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await pool.query(sql, params)).rows as T[];

export const unique = () => Math.random().toString(36).slice(2, 8);

export function inDays(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Attend un email (mode outbox) et renvoie son texte. */
export async function waitForEmail(to: string, template: string, after = new Date(0)): Promise<string> {
  for (let i = 0; i < 60; i++) {
    const rows = await q<{ text: string }>(`SELECT text FROM email_log WHERE "to" = $1 AND template = $2 AND "createdAt" > $3 ORDER BY "createdAt" DESC LIMIT 1`, [to, template, after]);
    if (rows[0]) return rows[0].text;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Email ${template} non reçu par ${to}`);
}

export const codeFrom = (text: string) => text.match(/Code : (\d{6})/)![1]!;
export const linkFrom = (text: string) => text.match(/(https?:\/\/\S+)/)![1]!;

export async function signUp(page: Page, u: { firstName: string; lastName: string; email: string; password: string; phone?: string }) {
  await page.goto("/inscription");
  await page.getByLabel("Prénom").fill(u.firstName);
  await page.getByLabel("Nom", { exact: true }).fill(u.lastName);
  await page.getByLabel("Adresse email").fill(u.email);
  await page.getByLabel("Téléphone").fill(u.phone ?? "+33612345678");
  await page.getByLabel("Mot de passe", { exact: true }).fill(u.password);
  await page.getByLabel("Confirmation du mot de passe").fill(u.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/verification-email/);
  const mail = await waitForEmail(u.email, "verifyEmail");
  await page.goto(linkFrom(mail));
  await expect(page).toHaveURL(/tableau-de-bord/);
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  // Attend la fin de la connexion (tableau de bord ou étape 2FA) avant toute navigation.
  await page.waitForURL((u) => u.pathname !== "/connexion");
}

export async function pickCity(page: Page, id: string, text: string, option: string) {
  const input = page.locator(`[id="${id}"]`);
  await input.fill(text);
  await page.getByRole("option", { name: new RegExp(option) }).first().click();
}

/** TOTP RFC 6238 (SHA-1, 6 chiffres, 30 s) pour tester la double authentification. */
export function totp(secretBase32: string, at = Date.now()) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of secretBase32.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1]! & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

let lastTotp = "";
/** Code TOTP jamais utilisé : attend la fenêtre suivante si nécessaire (le serveur refuse la réutilisation). */
export async function freshTotp(secret: string) {
  let code = totp(secret);
  while (code === lastTotp) {
    await new Promise((r) => setTimeout(r, 30_000 - (Date.now() % 30_000) + 500));
    code = totp(secret);
  }
  lastTotp = code;
  return code;
}
