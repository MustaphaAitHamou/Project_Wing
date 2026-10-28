import { test, expect } from "@playwright/test";
import { ADMIN } from "./global-setup";
import { freshTotp, q, signIn } from "./helpers";
import type { Page } from "@playwright/test";
import { createPaidBooking, createParcel, createUser } from "./fixtures";

/** Scénario C : administrateur — connexion sécurisée (2FA), modération, litige, audit. */
test.describe.serial("scénario C : administration", () => {
  let secret = "";

  /** Connexion sécurisée : mot de passe puis code TOTP. */
  async function adminLogin(page: Page) {
    await signIn(page, ADMIN.email, ADMIN.password);
    await expect(page).toHaveURL(/connexion\/2fa/);
    await page.getByLabel("Code à 6 chiffres").fill(await freshTotp(secret));
    await page.getByRole("button", { name: "Vérifier" }).click();
    await expect(page).toHaveURL(/tableau-de-bord/);
  }

  test("C1 : connexion, activation obligatoire de la 2FA puis accès à /admin", async ({ page }) => {
    await signIn(page, ADMIN.email, ADMIN.password);
    await expect(page).toHaveURL(/tableau-de-bord/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/parametres\/securite\?admin2fa=1/);
    await expect(page.getByText("Double authentification requise")).toBeVisible();
    await page.getByLabel("Mot de passe", { exact: true }).fill(ADMIN.password);
    await page.getByRole("button", { name: "Activer" }).click();
    const key = page.locator("code").filter({ hasText: /^[A-Z2-7]+=*$/ });
    await expect(key).toBeVisible();
    secret = (await key.textContent())!.trim();
    await page.getByLabel(/Saisissez le code affiché/).fill(await freshTotp(secret));
    await page.getByRole("button", { name: "Confirmer l'activation" }).click();
    await expect(page.getByText("La double authentification est activée.")).toBeVisible();
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
  });

  test("C1 bis : nouvelle connexion avec code TOTP", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
  });

  test("C2-C3 : consultation et modération d'une annonce", async ({ page }) => {
    const owner = await createUser();
    const parcel = await createParcel(owner.id, "Annonce à modérer E2E");
    await adminLogin(page);
    await page.goto(`/admin/annonces?q=${parcel.id}`);
    await expect(page.getByRole("link", { name: "Annonce à modérer E2E" })).toBeVisible();
    await page.getByRole("button", { name: "Suspendre" }).click();
    await page.getByRole("button", { name: "Confirmer" }).click();
    await expect(page.getByText("Suspendue", { exact: true })).toBeVisible();
    const [row] = await q<{ status: string }>(`SELECT status FROM parcel WHERE id = $1`, [parcel.id]);
    expect(row?.status).toBe("SUSPENDED");
  });

  test("C4-C6 : un expéditeur ouvre un litige, l'admin le traite (remboursement) et l'audit le trace", async ({ browser }) => {
    const f = await createPaidBooking("PICKED_UP");
    const userCtx = await browser.newContext();
    const user = await userCtx.newPage();
    await signIn(user, f.sender.email, f.sender.password);
    await user.goto(`/tableau-de-bord/reservations/${f.bookingId}`);
    await user.getByRole("button", { name: "Signaler un problème" }).click();
    await user.getByLabel("Nature du problème").selectOption("LOST");
    await user.getByLabel("Description").fill("Le voyageur ne répond plus depuis la remise du colis, aucune nouvelle.");
    await user.getByRole("button", { name: "Ouvrir le litige" }).click();
    await expect(user).toHaveURL(/litiges\//);
    await userCtx.close();

    const adminCtx = await browser.newContext();
    const admin = await adminCtx.newPage();
    await adminLogin(admin);
    await admin.goto("/admin/litiges");
    await admin.getByRole("row", { name: new RegExp(f.reference) }).getByRole("link").click();
    await admin.getByRole("button", { name: "Me l'assigner" }).click();
    await expect(admin.getByText("Litige assigné")).toBeVisible();
    await admin.getByLabel("Résolution").selectOption("FULL_REFUND");
    await admin.getByLabel("Motivation (visible des parties)").fill("Colis non livré, remboursement intégral de l'expéditeur.");
    await admin.getByRole("button", { name: "Appliquer la décision" }).click();
    await expect(admin.getByText("Décision appliquée")).toBeVisible();
    await expect.poll(async () => (await q<{ status: string }>(`SELECT status FROM booking WHERE id = $1`, [f.bookingId]))[0]?.status).toBe("REFUNDED");
    await admin.goto(`/admin/audit?action=dispute.resolve`);
    await expect(admin.getByText("dispute.resolve").first()).toBeVisible();
    await adminCtx.close();
  });
});
