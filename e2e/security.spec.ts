import { test, expect } from "@playwright/test";
import { q, signIn } from "./helpers";
import { createPaidBooking, createParcel, createProposal, createTrip, createUser } from "./fixtures";

/** Scénario D : sécurité et autorisations, vérifiées à travers l'interface réelle. */
test.describe("scénario D : sécurité", () => {
  test("D1 : un visiteur non connecté est redirigé vers la connexion", async ({ page }) => {
    await page.goto("/tableau-de-bord/colis");
    await expect(page).toHaveURL(/\/connexion\?next=/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/connexion/);
  });

  test("D1 bis : un utilisateur standard ne peut jamais accéder à /admin", async ({ page, request }) => {
    const u = await createUser();
    await signIn(page, u.email, u.password);
    await expect(page).toHaveURL(/tableau-de-bord/);
    await page.goto("/admin/utilisateurs");
    await expect(page).toHaveURL(/erreur=acces-refuse/);
    await expect(page.getByText("Vous n'avez pas accès à cette page.")).toBeVisible();
    // Export CSV protégé côté serveur.
    const res = await page.request.get("/api/admin/export");
    expect(res.status()).toBe(403);
    // Routes cron protégées par secret.
    expect((await request.post("/api/cron/jobs")).status()).toBe(401);
  });

  test("D2 : impossible de modifier l'annonce d'un autre utilisateur", async ({ page }) => {
    const owner = await createUser();
    const parcel = await createParcel(owner.id, "Annonce protégée");
    const intruder = await createUser();
    await signIn(page, intruder.email, intruder.password);
    await expect(page).toHaveURL(/tableau-de-bord/);
    await page.goto(`/tableau-de-bord/colis/${parcel.id}/modifier`);
    await expect(page.getByRole("heading", { name: "Cette page n'existe pas ou plus" })).toBeVisible();
    await page.goto(`/tableau-de-bord/colis/${parcel.id}`);
    await expect(page.getByRole("heading", { name: "Cette page n'existe pas ou plus" })).toBeVisible();
    const [row] = await q<{ title: string }>(`SELECT title FROM parcel WHERE id = $1`, [parcel.id]);
    expect(row?.title).toBe("Annonce protégée");
  });

  test("D3-D5 : OTP invalide, OTP expiré, puis double confirmation refusée", async ({ page }) => {
    const f = await createPaidBooking("READY_FOR_PICKUP");
    await signIn(page, f.traveler.email, f.traveler.password);
    await expect(page).toHaveURL(/tableau-de-bord/);
    await page.goto(`/tableau-de-bord/reservations/${f.bookingId}`);
    const input = page.getByLabel("Code de remise donné par l'expéditeur");

    // D3 : code invalide
    await input.fill("000000");
    await page.getByRole("button", { name: "Valider le code" }).click();
    await expect(page.getByText(/Code incorrect\. 4 essai\(s\) restant\(s\)/)).toBeVisible();

    // D4 : code expiré
    await q(`UPDATE delivery_verification SET "expiresAt" = now() - interval '1 minute' WHERE "bookingId" = $1`, [f.bookingId]);
    await input.fill(f.code);
    await page.getByRole("button", { name: "Valider le code" }).click();
    await expect(page.getByText(/a expiré/)).toBeVisible();

    // Code valide → remise confirmée
    await q(`UPDATE delivery_verification SET "expiresAt" = now() + interval '1 day' WHERE "bookingId" = $1`, [f.bookingId]);
    await input.fill(f.code);
    await page.getByRole("button", { name: "Valider le code" }).click();
    await expect(page.getByText("Remise confirmée")).toBeVisible();

    // D5 : seconde confirmation (ex. QR scanné après coup) refusée côté serveur
    await page.goto(`/scan?b=${f.bookingId}&p=PICKUP#${f.qrToken}`);
    await page.getByRole("button", { name: /Je confirme avoir reçu le colis/ }).click();
    await expect(page.getByText(/n'est pas attendue/)).toBeVisible();
    const [h] = await q<{ n: string }>(`SELECT COUNT(*) AS n FROM booking_status_history WHERE "bookingId" = $1 AND "toStatus" = 'PICKED_UP'`, [f.bookingId]);
    expect(Number(h?.n)).toBe(1);
  });

  test("D6 : une session de paiement déjà traitée ne peut pas être rejouée", async ({ page }) => {
    const f = await createPaidBooking("READY_FOR_PICKUP");
    await signIn(page, f.sender.email, f.sender.password);
    await expect(page).toHaveURL(/tableau-de-bord/);
    await page.goto(`/dev/paiement/sbx_cs_${f.bookingId}`);
    await expect(page.getByText(/n'est plus active/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Simuler un paiement réussi" })).toHaveCount(0);
    // Le webhook Stripe refuse toute requête non signée.
    const res = await page.request.post("/api/webhooks/stripe", { data: { id: "evt_fake" } });
    expect([400, 404]).toContain(res.status());
  });

  test("D7 : deux acceptations simultanées sur un même colis, une seule réservation", async ({ browser }) => {
    const sender = await createUser();
    const t1 = await createUser({ kyc: true });
    const t2 = await createUser({ kyc: true });
    const parcel = await createParcel(sender.id, "Colis convoité");
    const p1 = await createProposal(parcel.id, (await createTrip(t1.id)).id, t1.id, 3000);
    const p2 = await createProposal(parcel.id, (await createTrip(t2.id)).id, t2.id, 3200);
    const ctx = await browser.newContext();
    const a = await ctx.newPage();
    await signIn(a, sender.email, sender.password);
    await expect(a).toHaveURL(/tableau-de-bord/);
    const b = await ctx.newPage();
    await Promise.all([a.goto(`/tableau-de-bord/colis/${parcel.id}`), b.goto(`/tableau-de-bord/colis/${parcel.id}`)]);
    for (const [pg, n] of [[a, 0], [b, 1]] as const) {
      await pg.getByRole("button", { name: "Accepter" }).nth(n).click();
      await expect(pg.getByRole("button", { name: "Accepter et réserver" })).toBeVisible();
    }
    await Promise.all([a.getByRole("button", { name: "Accepter et réserver" }).click(), b.getByRole("button", { name: "Accepter et réserver" }).click()]);
    await expect.poll(async () => Number((await q<{ n: string }>(`SELECT COUNT(*) AS n FROM booking WHERE "parcelId" = $1`, [parcel.id]))[0]?.n)).toBe(1);
    const accepted = await q<{ id: string }>(`SELECT id FROM proposal WHERE "parcelId" = $1 AND status = 'ACCEPTED'`, [parcel.id]);
    expect(accepted).toHaveLength(1);
    expect([p1.id, p2.id]).toContain(accepted[0]!.id);
    await ctx.close();
  });
});
