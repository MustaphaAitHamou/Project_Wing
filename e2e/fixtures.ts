import { createHmac, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { q, unique } from "./helpers";

/**
 * Fixtures SQL pour les scénarios admin et sécurité : elles placent directement la
 * base dans un état donné (ex. réservation payée) afin de tester une étape précise
 * sans rejouer tout le parcours (déjà couvert par marketplace.spec.ts).
 */
const OTP_PEPPER = process.env.OTP_PEPPER ?? "dev-only-otp-pepper-change-me";
const otpHash = (bookingId: string, purpose: string, secret: string) => createHmac("sha256", OTP_PEPPER).update(`${bookingId}:${purpose}:${secret}`).digest("hex");

export async function createUser(o: { kyc?: boolean; firstName?: string } = {}) {
  const id = `u_${unique()}${unique()}`;
  const email = `${id}@tamurt.test`;
  const password = "Fixture-Pass2026";
  await q(`INSERT INTO "user" (id, name, email, "emailVerified", "firstName", "lastName", role, status, "termsAcceptedAt", "countryCode", phone, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, true, $4, 'Test', 'USER', 'ACTIVE', now(), 'FR', '+33611112222', now(), now())`, [id, `${o.firstName ?? "Test"} Test`, email, o.firstName ?? "Test"]);
  await q(`INSERT INTO "user_profile" ("userId", "kycStatus", "updatedAt") VALUES ($1, $2, now())`, [id, o.kyc ? "VERIFIED" : "UNVERIFIED"]);
  await q(`INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") VALUES ($1, $2, 'credential', $2, $3, now(), now())`, [`acc_${id}`, id, await hashPassword(password)]);
  return { id, email, password };
}

const ref = async () => {
  const [marseille] = await q<{ id: string }>(`SELECT id FROM city WHERE slug = 'marseille-fr'`);
  const [bejaia] = await q<{ id: string }>(`SELECT id FROM city WHERE slug = 'bejaia-dz'`);
  const [cat] = await q<{ id: string }>(`SELECT id FROM parcel_category WHERE slug = 'vetements'`);
  return { from: marseille!.id, to: bejaia!.id, cat: cat!.id };
};

export async function createParcel(senderId: string, title = `Colis ${unique()}`) {
  const r = await ref();
  const id = `p_${randomUUID().slice(0, 12)}`;
  await q(`INSERT INTO parcel (id, "senderId", "originCityId", "destCityId", "desiredDate", "dateFlexDays", title, "categoryId", description, "weightGrams", "lengthCm", "widthCm", "heightCm", quantity, "declaredValue", "isFragile", budget, currency, status, "publishedAt", "honorDeclarationAt", "rulesAcceptedAt", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, CURRENT_DATE + 10, 3, $5, $6, 'Contenu de test pour les scénarios E2E.', 3000, 30, 20, 20, 1, 5000, false, 4000, 'EUR', 'PUBLISHED', now(), now(), now(), now(), now())`, [id, senderId, r.from, r.to, title, r.cat]);
  await q(`INSERT INTO parcel_recipient ("parcelId", name, phone, email, city) VALUES ($1, 'Destinataire Test', '+213550000000', $2, 'Béjaïa')`, [id, `dest_${id}@tamurt.test`]);
  return { id, title };
}

export async function createTrip(travelerId: string) {
  const r = await ref();
  const id = `t_${randomUUID().slice(0, 12)}`;
  await q(`INSERT INTO trip (id, "travelerId", "originCityId", "destCityId", "departureDate", "transportMode", "capacityGrams", "pricePerKg", currency, status, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, CURRENT_DATE + 11, 'PLANE', 10000, 800, 'EUR', 'PUBLISHED', now(), now())`, [id, travelerId, r.from, r.to]);
  return { id };
}

export async function createProposal(parcelId: string, tripId: string, travelerId: string, price = 3000) {
  const id = `pr_${randomUUID().slice(0, 12)}`;
  await q(`INSERT INTO proposal (id, "parcelId", "tripId", "travelerId", "authorId", "initiatedBy", price, currency, status, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $4, 'TRAVELER', $5, 'EUR', 'PENDING', now(), now())`, [id, parcelId, tripId, travelerId, price]);
  return { id };
}

/** Réservation payée (simulateur) à l'état demandé, avec code de remise connu. */
export async function createPaidBooking(status: "READY_FOR_PICKUP" | "PICKED_UP" = "READY_FOR_PICKUP") {
  const sender = await createUser({ firstName: "Sara" });
  const traveler = await createUser({ firstName: "Idir", kyc: true });
  const parcel = await createParcel(sender.id);
  const trip = await createTrip(traveler.id);
  const prop = await createProposal(parcel.id, trip.id, traveler.id, 3000);
  await q(`UPDATE proposal SET status = 'ACCEPTED' WHERE id = $1`, [prop.id]);
  await q(`UPDATE parcel SET status = $2 WHERE id = $1`, [parcel.id, status === "PICKED_UP" ? "IN_TRANSIT" : "RESERVED"]);
  await q(`UPDATE trip SET "reservedGrams" = 3000 WHERE id = $1`, [trip.id]);
  const bookingId = `b_${randomUUID().slice(0, 12)}`;
  const reference = `TS-E2E${unique().toUpperCase().slice(0, 4)}`;
  await q(`INSERT INTO booking (id, reference, "parcelId", "tripId", "proposalId", "senderId", "travelerId", status, "transportPrice", "platformFee", "commissionRateBps", "travelerNet", "totalCharged", currency, "weightGrams", "volumeCm3", "acceptedAt", "paidAt", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 3000, 300, 1000, 2700, 3000, 'EUR', 3000, 12000, now(), now(), now(), now())`, [bookingId, reference, parcel.id, trip.id, prop.id, sender.id, traveler.id, status]);
  await q(`INSERT INTO payment (id, "bookingId", provider, "providerSessionId", "providerPaymentId", "idempotencyKey", amount, currency, status, "succeededAt", "createdAt", "updatedAt")
           VALUES ($1, $2, 'local_sandbox', $3, $4, $5, 3000, 'EUR', 'SUCCEEDED', now(), now(), now())`, [`pay_${bookingId}`, bookingId, `sbx_cs_${bookingId}`, `sbx_pi_${bookingId}`, `idem_${bookingId}`]);
  await q(`INSERT INTO commission (id, "bookingId", "rateBps", amount, currency, "createdAt", "updatedAt") VALUES ($1, $2, 1000, 300, 'EUR', now(), now())`, [`com_${bookingId}`, bookingId]);
  const code = "482913";
  const qrToken = `qr${randomUUID().replace(/-/g, "")}`;
  if (status === "READY_FOR_PICKUP")
    await q(`INSERT INTO delivery_verification (id, "bookingId", purpose, "codeHash", "qrTokenHash", "expiresAt", "createdAt") VALUES ($1, $2, 'PICKUP', $3, $4, now() + interval '3 days', now())`, [`dv_${bookingId}`, bookingId, otpHash(bookingId, "PICKUP", code), otpHash(bookingId, "PICKUP:qr", qrToken)]);
  return { sender, traveler, parcel, trip, bookingId, reference, code, qrToken };
}
