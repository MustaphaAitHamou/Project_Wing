/**
 * Données de référence (pays, villes, corridors, catégories, FAQ).
 * Idempotent : utilisé par le seed de développement, les tests et la mise en production.
 * Les corridors sont créés en TEST_ONLY : ils ne deviennent LIVE qu'après validation
 * juridique, via l'administration.
 */
import type { PrismaClient } from "../generated/prisma/client";
import { normalizeSearch, slugify } from "../lib/domain/text";

type CitySeed = [name: string, aliases: string[], popular?: boolean, lat?: number, lng?: number];

export const COUNTRIES = [
  { code: "FR", name: "France", currency: "EUR", phonePrefix: "+33", isActive: true, payoutsEnabled: true },
  { code: "DZ", name: "Algérie", currency: "DZD", phonePrefix: "+213", isActive: true, payoutsEnabled: false },
  { code: "BE", name: "Belgique", currency: "EUR", phonePrefix: "+32", isActive: false, payoutsEnabled: false },
  { code: "ES", name: "Espagne", currency: "EUR", phonePrefix: "+34", isActive: false, payoutsEnabled: false },
  { code: "DE", name: "Allemagne", currency: "EUR", phonePrefix: "+49", isActive: false, payoutsEnabled: false },
  { code: "CH", name: "Suisse", currency: "CHF", phonePrefix: "+41", isActive: false, payoutsEnabled: false },
  { code: "IT", name: "Italie", currency: "EUR", phonePrefix: "+39", isActive: false, payoutsEnabled: false },
  { code: "MA", name: "Maroc", currency: "MAD", phonePrefix: "+212", isActive: false, payoutsEnabled: false },
  { code: "TN", name: "Tunisie", currency: "TND", phonePrefix: "+216", isActive: false, payoutsEnabled: false },
] as const;

export const CITIES: Record<string, CitySeed[]> = {
  FR: [
    ["Paris", [], true, 48.8566, 2.3522],
    ["Marseille", [], true, 43.2965, 5.3698],
    ["Lyon", [], true, 45.764, 4.8357],
    ["Toulouse", [], false, 43.6047, 1.4442],
    ["Nice", [], false, 43.7102, 7.262],
    ["Montpellier", [], false, 43.6108, 3.8767],
    ["Lille", [], false, 50.6292, 3.0573],
    ["Bordeaux", [], false, 44.8378, -0.5792],
    ["Nantes", [], false, 47.2184, -1.5536],
    ["Strasbourg", [], false, 48.5734, 7.7521],
    ["Grenoble", [], false, 45.1885, 5.7245],
    ["Saint-Étienne", ["Saint Etienne"], false, 45.4397, 4.3872],
    ["Saint-Denis", [], false, 48.9362, 2.3574],
    ["Argenteuil", [], false, 48.9472, 2.2467],
    ["Créteil", [], false, 48.7904, 2.4556],
    ["Toulon", [], false, 43.1242, 5.928],
    ["Avignon", [], false, 43.9493, 4.8055],
    ["Rouen", [], false, 49.4432, 1.0999],
    ["Clermont-Ferrand", [], false, 45.7772, 3.087],
    ["Mulhouse", [], false, 47.7508, 7.3359],
  ],
  DZ: [
    ["Alger", ["Algiers", "Dzayer", "El Djazair"], true, 36.7538, 3.0588],
    ["Béjaïa", ["Bejaia", "Bgayet", "Bougie", "Vgayet"], true, 36.7509, 5.0567],
    ["Tizi Ouzou", ["Tizi-Ouzou", "Tizi Wezzu"], true, 36.7169, 4.0497],
    ["Bouira", ["Tubirett", "Tuvirett"], false, 36.3749, 3.902],
    ["Sétif", ["Setif", "Stif"], false, 36.1911, 5.4137],
    ["Oran", ["Wahran"], true, 35.6971, -0.6308],
    ["Constantine", ["Qacentina"], false, 36.365, 6.6147],
    ["Annaba", [], false, 36.9, 7.7667],
    ["Boumerdès", ["Boumerdes"], false, 36.7664, 3.4772],
    ["Azazga", ["Azazga"], false, 36.7444, 4.3719],
    ["Akbou", [], false, 36.4611, 4.5347],
    ["Draâ El Mizan", ["Draa El Mizan"], false, 36.5358, 3.8344],
    ["Larbaâ Nath Irathen", ["Larbaa Nath Irathen", "Fort National", "Larbaa"], false, 36.6347, 4.2067],
    ["Aïn El Hammam", ["Ain El Hammam", "Michelet"], false, 36.5667, 4.3167],
    ["Draâ Ben Khedda", ["Draa Ben Khedda"], false, 36.7333, 3.9667],
    ["Azeffoun", [], false, 36.8942, 4.4192],
    ["Kherrata", [], false, 36.4936, 5.2775],
    ["Sidi Aïch", ["Sidi Aich"], false, 36.6119, 4.6908],
    ["Blida", [], false, 36.47, 2.8277],
    ["Batna", [], false, 35.5559, 6.1741],
  ],
  BE: [["Bruxelles", ["Brussels", "Brussel"], false], ["Liège", ["Liege"], false], ["Anvers", ["Antwerpen"], false]],
  ES: [["Madrid", [], false], ["Barcelone", ["Barcelona"], false], ["Alicante", [], false]],
  DE: [["Berlin", [], false], ["Francfort", ["Frankfurt"], false]],
  CH: [["Genève", ["Geneve", "Geneva"], false], ["Zurich", [], false]],
  IT: [["Rome", ["Roma"], false], ["Milan", ["Milano"], false]],
  MA: [["Casablanca", [], false], ["Rabat", [], false]],
  TN: [["Tunis", [], false], ["Sfax", [], false]],
};

export const CATEGORIES = [
  { slug: "vetements", name: "Vêtements et textiles", description: "Vêtements neufs ou usagés, linge de maison.", sortOrder: 1 },
  { slug: "livres-documents", name: "Livres et documents", description: "Livres, papiers personnels non officiels, photos.", sortOrder: 2 },
  { slug: "electronique", name: "Électronique", description: "Téléphones, ordinateurs, accessoires. Facture recommandée.", sortOrder: 3 },
  { slug: "cosmetiques", name: "Cosmétiques et hygiène", description: "Produits scellés. Liquides soumis aux règles du transporteur aérien.", sortOrder: 4 },
  { slug: "cadeaux", name: "Cadeaux et objets personnels", description: "Objets du quotidien, jouets, décoration.", sortOrder: 5 },
  { slug: "alimentaire-sec", name: "Alimentaire non périssable", description: "Produits secs scellés. Soumis à validation : règles douanières et sanitaires strictes.", requiresReview: true, sortOrder: 6 },
  { slug: "medicaments", name: "Médicaments", description: "Soumis à validation : ordonnance et réglementation douanière à vérifier.", requiresReview: true, sortOrder: 7 },
  { slug: "pieces-auto", name: "Pièces automobiles", description: "Uniquement par voiture ou ferry.", allowedModes: ["CAR", "FERRY"] as const, sortOrder: 8 },
  { slug: "armes", name: "Armes, munitions et répliques", isProhibited: true, sortOrder: 100 },
  { slug: "stupefiants", name: "Stupéfiants et substances illicites", isProhibited: true, sortOrder: 101 },
  { slug: "matieres-dangereuses", name: "Matières dangereuses, inflammables ou explosives", description: "Gaz, batteries lithium en vrac, produits chimiques, aérosols inflammables…", isProhibited: true, sortOrder: 102 },
  { slug: "especes-valeurs", name: "Espèces, métaux précieux et titres", isProhibited: true, sortOrder: 103 },
  { slug: "contrefacons", name: "Contrefaçons", isProhibited: true, sortOrder: 104 },
  { slug: "animaux", name: "Animaux vivants, plantes et produits d'origine animale", isProhibited: true, sortOrder: 105 },
  { slug: "perissables", name: "Denrées périssables", description: "Viande, produits laitiers, plats cuisinés.", isProhibited: true, sortOrder: 106 },
];

export const FAQ = [
  { category: "general", question: "Comment fonctionne Tamurt Sending ?", answer: "Vous publiez votre colis (trajet, poids, dimensions, contenu, budget). Des voyageurs qui font déjà ce trajet vous proposent de le transporter. Vous choisissez, payez en ligne, remettez le colis au voyageur avec un code de confirmation, et le destinataire confirme la réception avec un second code." },
  { category: "general", question: "Quels trajets sont disponibles ?", answer: "Au lancement, Tamurt Sending se concentre sur les trajets entre la France et l'Algérie, notamment la Kabylie. D'autres pays seront ouverts progressivement." },
  { category: "expediteur", question: "Quand suis-je débité ?", answer: "Le paiement est demandé une fois que vous avez accepté la proposition d'un voyageur. Il est traité par notre prestataire de paiement. Le voyageur n'est rémunéré qu'après la livraison confirmée par le code du destinataire." },
  { category: "expediteur", question: "Que se passe-t-il si j'annule ?", answer: "Vous pouvez annuler tant que le colis n'a pas été remis au voyageur. Si vous avez déjà payé, le remboursement est demandé automatiquement au prestataire de paiement. Les conditions définitives d'annulation figurent dans les conditions générales." },
  { category: "expediteur", question: "Mon colis est-il assuré ?", answer: "Non. À ce jour, Tamurt Sending ne propose pas d'assurance. Ne confiez pas d'objets de grande valeur et déclarez toujours une valeur exacte. En cas de problème, un litige peut être ouvert et examiné par notre équipe." },
  { category: "voyageur", question: "Pourquoi dois-je vérifier mon identité ?", answer: "La vérification d'identité est obligatoire pour transporter des colis. Elle est réalisée par un prestataire spécialisé : Tamurt Sending ne stocke pas vos documents d'identité." },
  { category: "voyageur", question: "Quand suis-je payé ?", answer: "Votre rémunération est versée sur votre compte de versement après la livraison confirmée et la clôture de la transaction, sauf litige en cours. Les versements vers certains pays, dont l'Algérie, ne sont pas encore disponibles : votre tableau de bord vous l'indique clairement." },
  { category: "voyageur", question: "Dois-je ouvrir les colis ?", answer: "Vous avez le droit et le devoir de vérifier le contenu en présence de l'expéditeur avant d'accepter le colis. Refusez tout colis dont le contenu ne correspond pas à l'annonce ou qui contient un objet interdit." },
  { category: "securite", question: "À quoi servent les codes de confirmation ?", answer: "L'expéditeur reçoit un code qu'il donne au voyageur au moment de la remise. Le destinataire reçoit un second code qu'il donne au voyageur à la réception. Ces codes prouvent chaque étape et ne doivent jamais être communiqués à l'avance." },
  { category: "securite", question: "Quels objets sont interdits ?", answer: "Armes, stupéfiants, matières dangereuses, espèces, contrefaçons, animaux, denrées périssables, et tout objet interdit par les douanes des pays traversés. Consultez la page Objets interdits pour la liste complète." },
];

export async function seedReferenceData(db: PrismaClient) {
  for (const c of COUNTRIES) await db.country.upsert({ where: { code: c.code }, create: c, update: { name: c.name, currency: c.currency, phonePrefix: c.phonePrefix } });
  for (const [countryCode, cities] of Object.entries(CITIES)) {
    for (const [name, aliases, popular = false, lat, lng] of cities) {
      const slug = `${slugify(name)}-${countryCode.toLowerCase()}`;
      const searchNames = [...new Set([name, ...aliases].map(normalizeSearch))];
      await db.city.upsert({ where: { slug }, create: { slug, name, countryCode, aliases, searchNames, isPopular: popular, latitude: lat, longitude: lng }, update: { name, aliases, searchNames, isPopular: popular } });
    }
  }
  for (const [o, d] of [["FR", "DZ"], ["DZ", "FR"]] as const) {
    await db.corridor.upsert({
      where: { originCountry_destCountry: { originCountry: o, destCountry: d } },
      create: { originCountry: o, destCountry: d, status: "TEST_ONLY", allowedModes: ["PLANE", "FERRY", "CAR"], maxWeightGrams: 23_000, notes: "Ouverture LIVE soumise à validation juridique (douanes, statut des voyageurs, assurance)." },
      update: {},
    });
  }
  for (const c of CATEGORIES) {
    const data = { name: c.name, description: c.description ?? null, isProhibited: c.isProhibited ?? false, requiresReview: c.requiresReview ?? false, allowedModes: [...(c.allowedModes ?? [])], sortOrder: c.sortOrder };
    await db.parcelCategory.upsert({ where: { slug: c.slug }, create: { slug: c.slug, ...data }, update: data });
  }
  if ((await db.faqItem.count()) === 0) await db.faqItem.createMany({ data: FAQ.map((f, i) => ({ ...f, sortOrder: i })) });
}
