import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { codeFrom, inDays, pickCity, q, signUp, unique, waitForEmail } from "./helpers";

/**
 * Scénarios A (expéditeur) et B (voyageur), joués ensemble car ils interagissent :
 * inscription → publication → recherche → proposition → acceptation → paiement (simulateur)
 * → remise par OTP → transport → livraison par OTP → clôture → avis → revenus.
 */
test.describe.serial("parcours expéditeur et voyageur", () => {
  const id = unique();
  const sender = { firstName: "Lila", lastName: "Expéditrice", email: `lila.${id}@tamurt.test`, password: "Expediteur-2026" };
  const traveler = { firstName: "Amar", lastName: "Voyageur", email: `amar.${id}@tamurt.test`, password: "Voyageur-2026x" };
  const recipientEmail = `yasmine.${id}@tamurt.test`;
  const title = `Vêtements pour enfants ${id}`;
  let sCtx: BrowserContext, tCtx: BrowserContext, s: Page, t: Page;
  let bookingUrl = "";

  test.beforeAll(async ({ browser }) => {
    sCtx = await browser.newContext();
    tCtx = await browser.newContext();
    s = await sCtx.newPage();
    t = await tCtx.newPage();
  });
  test.afterAll(async () => {
    await sCtx.close();
    await tCtx.close();
  });

  test("B1-B2 : le voyageur s'inscrit, confirme son email et vérifie son identité (simulateur)", async () => {
    await signUp(t, traveler);
    await t.goto("/tableau-de-bord/parametres/verification");
    await t.getByRole("button", { name: "Commencer la vérification" }).click();
    await expect(t).toHaveURL(/\/dev\/kyc\//);
    await t.getByRole("button", { name: "Simuler une identité vérifiée" }).click();
    await expect(t.getByText("Identité vérifiée", { exact: true })).toBeVisible();
  });

  test("B3 : le voyageur publie un trajet Marseille → Béjaïa", async () => {
    await t.goto("/tableau-de-bord/trajets/nouveau");
    await pickCity(t, "originCityId", "Marseil", "Marseille");
    await pickCity(t, "destCityId", "Bgayet", "Béjaïa");
    await t.getByLabel("Date de départ").fill(inDays(12));
    await t.getByLabel("Poids disponible (kg)").fill("10");
    await t.getByLabel("Prix demandé par kg (€)").fill("8");
    await t.getByRole("button", { name: "Publier le trajet" }).click();
    await expect(t).toHaveURL(/\/tableau-de-bord\/trajets\/(?!nouveau)[a-z0-9]+$/);
    await expect(t.getByRole("heading", { name: "Marseille → Béjaïa" })).toBeVisible();
  });

  test("A1-A3 : l'expéditeur s'inscrit et publie un colis en 5 étapes", async () => {
    await signUp(s, sender);
    await s.goto("/tableau-de-bord/colis/nouveau");
    await pickCity(s, "originCityId", "marseille", "Marseille");
    await pickCity(s, "destCityId", "bejaia", "Béjaïa");
    await s.getByLabel("Date d'expédition souhaitée").fill(inDays(13));
    await s.getByRole("button", { name: "Continuer" }).click();

    await s.getByLabel("Titre de l'annonce").fill(title);
    await s.getByLabel("Catégorie").selectOption({ label: "Vêtements et textiles" });
    await s.getByLabel("Description précise du contenu").fill("Un sac de vêtements neufs pour enfants, étiquettes attachées.");
    await s.getByLabel("Poids (kg)").fill("4");
    await s.getByLabel("Longueur (cm)").fill("40");
    await s.getByLabel("Largeur (cm)").fill("30");
    await s.getByLabel("Hauteur (cm)").fill("20");
    await s.getByLabel("Valeur déclarée (€)").fill("120");
    await s.getByRole("button", { name: "Continuer" }).click();

    await s.getByLabel("Nom du destinataire").fill("Yasmine B.");
    await s.getByLabel("Téléphone du destinataire").fill("+213550123456");
    await s.getByLabel("Email du destinataire").fill(recipientEmail);
    await s.getByLabel("Ville / quartier de remise").fill("Béjaïa centre");
    await s.getByRole("button", { name: "Continuer" }).click();

    await s.getByLabel("Budget proposé (€)").fill("40");
    await expect(s.getByText("Total que vous payez")).toBeVisible();
    await s.getByRole("button", { name: "Continuer" }).click();

    await s.getByText(/Je déclare sur l'honneur/).click();
    await s.getByText(/J'accepte les règles de transport/).click();
    await s.getByRole("button", { name: "Publier l'annonce" }).click();
    await expect(s).toHaveURL(/\/tableau-de-bord\/colis\/(?!nouveau)[a-z0-9]+$/);
    await expect(s.getByText("Publiée", { exact: true })).toBeVisible();
    // Le trajet du voyageur apparaît dans les correspondances.
    await expect(s.getByText(/Trajets compatibles \([1-9]\d*\)/)).toBeVisible();
  });

  test("B4-B5 : le voyageur trouve le colis par la recherche et envoie une proposition", async () => {
    await t.goto("/rechercher?mode=colis&from=marseille-fr&to=bejaia-dz");
    await t.getByRole("link", { name: new RegExp(title) }).click();
    await t.getByRole("button", { name: "Proposer mes services" }).click();
    await t.getByLabel("Prix du transport (€)").fill("35");
    await t.getByLabel("Message").fill("Bonjour, je peux récupérer le colis la veille de mon départ.");
    await t.getByRole("button", { name: "Envoyer" }).click();
    await expect(t.getByText("Proposition envoyée")).toBeVisible();
  });

  test("A4-A6 : l'expéditeur accepte puis paie en sandbox", async () => {
    await s.goto("/tableau-de-bord/colis");
    await s.getByRole("link", { name: new RegExp(title) }).click();
    await expect(s.getByText("« Bonjour, je peux récupérer le colis la veille de mon départ. »")).toBeVisible();
    await s.getByRole("button", { name: "Accepter" }).click();
    await s.getByRole("button", { name: "Accepter et réserver" }).click();
    await expect(s).toHaveURL(/\/tableau-de-bord\/reservations\//);
    bookingUrl = new URL(s.url()).pathname;
    await expect(s.getByText("Acceptée", { exact: true })).toBeVisible();
    await s.getByRole("button", { name: /Payer 35 €/ }).click();
    await expect(s).toHaveURL(/\/dev\/paiement\//);
    await s.getByRole("button", { name: "Simuler un paiement réussi" }).click();
    await expect(s).toHaveURL(new RegExp(`${bookingUrl}\\?paiement=retour`));
    await expect(s.getByText("Prête pour la remise", { exact: true })).toBeVisible();
  });

  test("A7 / B6 : remise confirmée par le code de l'expéditeur", async () => {
    const mail = await waitForEmail(sender.email, "pickupCode");
    await t.goto(bookingUrl);
    // Coordonnées du destinataire visibles après paiement.
    await expect(t.getByText("Yasmine B.")).toBeVisible();
    await t.getByLabel("Code de remise donné par l'expéditeur").fill(codeFrom(mail));
    await t.getByRole("button", { name: "Valider le code" }).click();
    await expect(t.getByText("Colis remis au voyageur", { exact: true }).first()).toBeVisible();
  });

  test("B7 : transport puis livraison confirmée par le code du destinataire", async () => {
    await t.getByRole("button", { name: "Je suis en route" }).click();
    await expect(t.getByText("En transport", { exact: true })).toBeVisible();
    await t.getByRole("button", { name: "Je suis arrivé, prêt à livrer" }).click();
    await t.getByRole("button", { name: "Confirmer" }).click();
    await expect(t.getByText("Arrivé, en cours de livraison", { exact: true })).toBeVisible();
    const mail = await waitForEmail(recipientEmail, "deliveryCode");
    await t.getByLabel("Code de réception donné par le destinataire").fill(codeFrom(mail));
    await t.getByRole("button", { name: "Valider le code" }).click();
    await expect(t.getByText("Livrée", { exact: true })).toBeVisible();
  });

  test("A8-A9 : l'expéditeur suit la livraison, clôture et évalue", async () => {
    await s.goto(bookingUrl);
    await expect(s.getByText("Livraison confirmée", { exact: true })).toBeVisible();
    await s.getByRole("button", { name: "Confirmer la bonne réception" }).click();
    await s.getByRole("button", { name: "Oui, clôturer" }).click();
    await expect(s.getByText("Terminée", { exact: true })).toBeVisible();
    await s.getByRole("radio", { name: "5 étoiles" }).click();
    await s.getByLabel("Commentaire").fill("Voyageur ponctuel et très soigneux.");
    await s.getByRole("button", { name: "Publier l'avis" }).click();
    await expect(s.getByText(/Merci pour votre avis/).first()).toBeVisible();
  });

  test("B8 : le voyageur consulte ses revenus (net de commission)", async () => {
    await t.goto("/tableau-de-bord/revenus");
    await expect(t.getByText(title)).toBeVisible();
    // 35 € - 10 % = 31,50 €
    await expect(t.getByText("31,50 €").first()).toBeVisible();
    const rows = await q<{ status: string }>(`SELECT p.status FROM payout p JOIN booking b ON b.id = p."bookingId" JOIN "user" u ON u.id = b."travelerId" WHERE u.email = $1`, [traveler.email]);
    expect(rows[0]?.status).toBe("BLOCKED"); // compte de versement non configuré
  });
});
