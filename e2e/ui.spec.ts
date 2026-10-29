import { test, expect, type Locator, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createUser } from "./fixtures";
import { q, signIn, unique } from "./helpers";

/** Régressions d'interface : saisies numériques, mise en page des filtres, boutons, notifications, mobile. */

/** Position d'un élément, après avoir attendu qu'il soit affiché (boundingBox n'attend pas la visibilité). */
const box = async (l: Locator) => {
  await expect(l).toBeVisible();
  return (await l.boundingBox())!;
};

test.describe("interface", () => {
  test("E1 : les champs prix et poids des filtres refusent les lettres", async ({ page }) => {
    await page.goto("/rechercher?mode=colis&from=marseille-fr&to=bejaia-dz");
    await page.waitForLoadState("networkidle"); // champs contrôlés : attendre l'hydratation
    const budget = page.getByLabel("Budget minimum (€)");
    await budget.pressSequentially("ngbvv12a,5x0");
    await expect(budget).toHaveValue("12,50");
    const weight = page.getByLabel("Poids maximum (kg)");
    await weight.pressSequentially("abc4.75");
    await expect(weight).toHaveValue("4.7");
    await page.getByRole("button", { name: "Appliquer" }).click();
    await expect(page).toHaveURL(/minBudget=12%2C50/);
  });

  test("E2 : les dates « Du » et « Au » restent dans le panneau de filtres", async ({ page }) => {
    await page.goto("/rechercher?mode=colis");
    const panel = page.getByLabel("Du", { exact: true }).locator("xpath=ancestor::form");
    const p = await box(panel);
    for (const label of ["Du", "Au"]) {
      const f = await box(page.getByLabel(label, { exact: true }));
      expect(f.x).toBeGreaterThanOrEqual(p.x - 1);
      expect(f.x + f.width).toBeLessThanOrEqual(p.x + p.width + 1);
    }
  });

  test("E3 : les boutons des pages de contenu sont lisibles et non soulignés", async ({ page }) => {
    await page.goto("/envoyer-un-colis");
    for (const name of ["Publier mon colis", "Voir les trajets disponibles"]) {
      const link = page.getByRole("link", { name });
      await expect(link).toBeVisible();
      const s = await link.evaluate((el) => {
        const c = getComputedStyle(el);
        return { color: c.color, bg: c.backgroundColor, deco: c.textDecorationLine };
      });
      expect(s.color, `${name} : texte de la couleur du fond`).not.toBe(s.bg);
      expect(s.deco).toBe("none");
    }
    // Les liens de texte restent soulignés.
    const inline = page.getByRole("link", { name: "objets interdits", exact: true });
    expect(await inline.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe("underline");
  });

  test("E4 : ouvrir une notification la marque comme lue", async ({ page }) => {
    const u = await createUser();
    const id = `n_${randomUUID().slice(0, 12)}`;
    const title = `Nouvelle proposition ${unique()}`;
    await q(`INSERT INTO notification (id, "userId", type, title, body, link, "createdAt") VALUES ($1, $2, 'NEW_PROPOSAL', $3, 'Un voyageur vous propose ses services.', '/tableau-de-bord/colis', now())`, [id, u.id, title]);
    await signIn(page, u.email, u.password);
    await page.goto("/tableau-de-bord/notifications");
    await page.getByRole("link", { name: title }).click();
    await expect(page).toHaveURL(/\/tableau-de-bord\/colis$/);
    const [row] = await q<{ readAt: Date | null }>(`SELECT "readAt" FROM notification WHERE id = $1`, [id]);
    expect(row?.readAt).not.toBeNull();
  });

  test("E5 : la notification d'un autre utilisateur n'est ni lue ni suivie", async ({ page }) => {
    const owner = await createUser();
    const other = await createUser();
    const id = `n_${randomUUID().slice(0, 12)}`;
    await q(`INSERT INTO notification (id, "userId", type, title, body, link, "createdAt") VALUES ($1, $2, 'NEW_PROPOSAL', 'Privée', 'x', '/tableau-de-bord/colis', now())`, [id, owner.id]);
    await signIn(page, other.email, other.password);
    await page.goto(`/tableau-de-bord/notifications/${id}`);
    await expect(page).toHaveURL(/\/tableau-de-bord\/notifications$/);
    const [row] = await q<{ readAt: Date | null }>(`SELECT "readAt" FROM notification WHERE id = $1`, [id]);
    expect(row?.readAt).toBeNull();
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true });

  const noHorizontalScroll = async (page: Page) =>
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

  for (const path of ["/", "/rechercher?mode=colis&from=marseille-fr&to=bejaia-dz", "/envoyer-un-colis", "/devenir-transporteur", "/comment-ca-marche", "/connexion", "/inscription"]) {
    test(`E6 : pas de défilement horizontal sur ${path}`, async ({ page }) => {
      await page.goto(path);
      await noHorizontalScroll(page);
    });
  }

  test("E7 : filtres en fenêtre sur mobile, dates contenues", async ({ page }) => {
    await page.goto("/rechercher?mode=trajets");
    await page.getByRole("button", { name: "Filtres et tri" }).click();
    const dialog = page.getByRole("dialog");
    const d = await box(dialog);
    for (const label of ["Du", "Au"]) {
      const f = await box(dialog.getByLabel(label, { exact: true }));
      expect(f.x + f.width).toBeLessThanOrEqual(d.x + d.width + 1);
    }
    const price = dialog.getByLabel("Prix max par kg (€)");
    await price.pressSequentially("8€/kg");
    await expect(price).toHaveValue("8");
  });
});
