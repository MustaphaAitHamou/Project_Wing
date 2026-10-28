import "server-only";
import { z } from "zod";
import { db } from "@/server/db/client";
import { scoreMatch } from "@/lib/domain/matching";
import { computeFees, formatMoney } from "@/lib/domain/money";
import { bookingReference } from "@/lib/domain/reference";
import { getSetting } from "@/server/settings";
import { notify } from "@/server/services/notifications";
import { requireTravelerVerified } from "@/server/services/trips";
import { assertCorridorOpen } from "@/server/services/geo";
import { addDeliveryEvent, reserveCapacity } from "@/server/services/booking-core";
import { ensureConversation, postSystemlessMessage } from "@/server/services/messaging";
import { conflict, forbidden, invalid, notFound } from "@/server/security/errors";
import { idSchema, moneyInput } from "@/features/shared/schemas";
import { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/server/auth/session";

export const createProposalSchema = z.object({
  parcelId: idSchema,
  tripId: idSchema,
  price: moneyInput("Prix", { min: 500, max: 500_000 }),
  message: z.string().trim().max(1000).transform((s) => s || undefined).optional(),
});

/**
 * Crée une proposition. Deux sens possibles :
 * - le voyageur propose de transporter un colis (initiatedBy TRAVELER) ;
 * - l'expéditeur sollicite un voyageur pour son colis (initiatedBy SENDER).
 * L'autre partie accepte ou refuse.
 */
export async function createProposal(user: CurrentUser, input: z.output<typeof createProposalSchema>) {
  if (!user.emailVerified) throw forbidden("Confirmez votre adresse email pour continuer.");
  const [parcel, trip] = await Promise.all([
    db.parcel.findUnique({ where: { id: input.parcelId }, include: { originCity: true, destCity: true, category: true } }),
    db.trip.findUnique({ where: { id: input.tripId }, include: { originCity: true, destCity: true, traveler: { select: { status: true, profile: true } } } }),
  ]);
  if (!parcel || !trip) throw notFound();
  let initiatedBy: "TRAVELER" | "SENDER";
  if (trip.travelerId === user.id) initiatedBy = "TRAVELER";
  else if (parcel.senderId === user.id) initiatedBy = "SENDER";
  else throw notFound();
  if (parcel.senderId === trip.travelerId) throw invalid("Vous ne pouvez pas transporter votre propre colis.");
  if (parcel.status !== "PUBLISHED") throw conflict("Ce colis n'est plus disponible.");
  if (trip.status !== "PUBLISHED") throw conflict("Ce trajet n'est plus disponible.");
  if (trip.traveler.status !== "ACTIVE") throw conflict("Ce voyageur n'est plus disponible.");
  if (trip.currency !== parcel.currency) throw invalid("Devises incompatibles.");
  if (initiatedBy === "TRAVELER") await requireTravelerVerified(user.id);
  await assertCorridorOpen(parcel.originCity.countryCode, parcel.destCity.countryCode, trip.transportMode);

  const blocked = await db.userBlock.count({ where: { OR: [{ blockerId: parcel.senderId, blockedId: trip.travelerId }, { blockerId: trip.travelerId, blockedId: parcel.senderId }] } });
  if (blocked > 0) throw forbidden("Impossible de contacter cet utilisateur.");

  const m = scoreMatch(
    { originCityId: parcel.originCityId, destCityId: parcel.destCityId, originCountry: parcel.originCity.countryCode, destCountry: parcel.destCity.countryCode, desiredDate: parcel.desiredDate, dateFlexDays: parcel.dateFlexDays, weightGrams: parcel.weightGrams, volumeCm3: parcel.lengthCm * parcel.widthCm * parcel.heightCm, isFragile: parcel.isFragile, budget: parcel.budget, currency: parcel.currency, allowedModes: parcel.category.allowedModes },
    { originCityId: trip.originCityId, destCityId: trip.destCityId, originCountry: trip.originCity.countryCode, destCountry: trip.destCity.countryCode, departureDate: trip.departureDate, transportMode: trip.transportMode, availableGrams: trip.capacityGrams - trip.reservedGrams, availableVolumeCm3: trip.capacityVolumeCm3 == null ? null : trip.capacityVolumeCm3 - trip.reservedVolumeCm3, acceptsFragile: trip.acceptsFragile, pricePerKg: trip.pricePerKg, minPrice: trip.minPrice, currency: trip.currency, travelerVerified: trip.traveler.profile?.kycStatus === "VERIFIED", travelerRating: null },
  );
  if (!m.compatible) {
    const why = m.reasons.filter((r) => !r.ok).map((r) => r.label).join(", ");
    throw invalid(`Ce trajet n'est pas compatible avec ce colis : ${why}.`);
  }

  return db.$transaction(async (tx) => {
    const existing = await tx.proposal.findUnique({ where: { parcelId_tripId: { parcelId: parcel.id, tripId: trip.id } } });
    if (existing && (existing.status === "PENDING" || existing.status === "ACCEPTED")) throw conflict("Une proposition existe déjà entre ce colis et ce trajet.");
    const data = { price: input.price, currency: parcel.currency, message: input.message ?? null, status: "PENDING" as const, initiatedBy, authorId: user.id, respondedAt: null };
    const proposal = existing
      ? await tx.proposal.update({ where: { id: existing.id }, data })
      : await tx.proposal.create({ data: { ...data, parcelId: parcel.id, tripId: trip.id, travelerId: trip.travelerId } });

    const counterpartId = initiatedBy === "TRAVELER" ? parcel.senderId : trip.travelerId;
    const conv = await ensureConversation(tx, [parcel.senderId, trip.travelerId], { parcelId: parcel.id, tripId: trip.id });
    if (input.message) await postSystemlessMessage(tx, conv.id, user.id, input.message);
    await notify(tx, {
      userId: counterpartId, type: "NEW_PROPOSAL",
      title: initiatedBy === "TRAVELER" ? `Proposition de transport pour « ${parcel.title} »` : `Demande de transport sur votre trajet ${trip.originCity.name} → ${trip.destCity.name}`,
      body: `${user.firstName} propose ${formatMoney(input.price, parcel.currency)}.`,
      link: initiatedBy === "TRAVELER" ? `/tableau-de-bord/colis/${parcel.id}` : `/tableau-de-bord/trajets/${trip.id}`,
    });
    return proposal;
  });
}

async function loadForParty(userId: string, proposalId: string) {
  const p = await db.proposal.findUnique({ where: { id: proposalId }, include: { parcel: true, trip: { include: { originCity: true, destCity: true } } } });
  if (!p || (p.parcel.senderId !== userId && p.travelerId !== userId)) throw notFound();
  return p;
}

export async function updateProposal(userId: string, proposalId: string, input: { price: number; message?: string }) {
  const p = await loadForParty(userId, proposalId);
  if (p.authorId !== userId) throw forbidden("Seul l'auteur peut modifier la proposition.");
  const res = await db.proposal.updateMany({ where: { id: proposalId, status: "PENDING" }, data: { price: input.price, message: input.message ?? null } });
  if (res.count !== 1) throw conflict("Cette proposition ne peut plus être modifiée.");
}

export async function withdrawProposal(userId: string, proposalId: string) {
  const p = await loadForParty(userId, proposalId);
  if (p.authorId !== userId) throw forbidden("Seul l'auteur peut retirer la proposition.");
  const res = await db.proposal.updateMany({ where: { id: proposalId, status: "PENDING" }, data: { status: "WITHDRAWN", respondedAt: new Date() } });
  if (res.count !== 1) throw conflict("Cette proposition ne peut plus être retirée.");
}

export async function rejectProposal(userId: string, proposalId: string) {
  const p = await loadForParty(userId, proposalId);
  if (p.authorId === userId) throw forbidden("Retirez votre proposition plutôt que de la refuser.");
  await db.$transaction(async (tx) => {
    const res = await tx.proposal.updateMany({ where: { id: proposalId, status: "PENDING" }, data: { status: "REJECTED", respondedAt: new Date() } });
    if (res.count !== 1) throw conflict("Cette proposition a déjà été traitée.");
    await notify(tx, { userId: p.authorId, type: "PROPOSAL_REJECTED", title: "Proposition refusée", body: `Votre proposition pour « ${p.parcel.title} » n'a pas été retenue.`, link: p.authorId === p.travelerId ? `/tableau-de-bord/trajets/${p.tripId}` : `/tableau-de-bord/colis/${p.parcelId}` });
  });
}

/**
 * Acceptation d'une proposition → création de la réservation.
 * Transaction unique : verrouillage du colis (FOR UPDATE), réservation atomique de la
 * capacité, figement des montants, refus des autres propositions. L'index unique partiel
 * `booking_one_active_per_parcel` empêche en dernier recours toute double réservation.
 */
export async function acceptProposal(user: CurrentUser, proposalId: string) {
  const p = await loadForParty(user.id, proposalId);
  if (p.authorId === user.id) throw forbidden("C'est à l'autre partie d'accepter votre proposition.");
  if (p.travelerId === user.id) await requireTravelerVerified(user.id);
  const [rateBps, feeModel, travelerKyc, senderThreshold] = await Promise.all([
    getSetting("commission.rateBps"),
    getSetting("commission.feeModel"),
    getSetting("kyc.travelerRequired"),
    getSetting("kyc.senderRequiredAboveValue"),
  ]);

  try {
    return await db.$transaction(async (tx) => {
      // Sérialise les acceptations concurrentes pour un même colis.
      await tx.$queryRaw`SELECT id FROM "parcel" WHERE id = ${p.parcelId} FOR UPDATE`;
      const proposal = await tx.proposal.findUniqueOrThrow({ where: { id: proposalId }, include: { parcel: true, trip: true } });
      if (proposal.status !== "PENDING") throw conflict("Cette proposition n'est plus disponible.");
      if (proposal.parcel.status !== "PUBLISHED") throw conflict("Ce colis est déjà réservé ou n'est plus publié.");
      const parcel = proposal.parcel;
      const volume = parcel.lengthCm * parcel.widthCm * parcel.heightCm;
      if (!(await reserveCapacity(tx, proposal.tripId, parcel.weightGrams, volume)))
        throw conflict("Le voyageur n'a plus assez de place disponible sur ce trajet.");

      const fees = computeFees(proposal.price, rateBps, feeModel);
      const [travelerProfile, senderProfile] = await Promise.all([
        tx.userProfile.findUnique({ where: { userId: proposal.travelerId } }),
        tx.userProfile.findUnique({ where: { userId: parcel.senderId } }),
      ]);
      const needsVerification =
        (travelerKyc && travelerProfile?.kycStatus !== "VERIFIED") || (parcel.declaredValue > senderThreshold && senderProfile?.kycStatus !== "VERIFIED");
      const status = needsVerification ? "AWAITING_VERIFICATION" : "ACCEPTED";
      const now = new Date();

      const booking = await tx.booking.create({
        data: {
          reference: bookingReference(), parcelId: parcel.id, tripId: proposal.tripId, proposalId, senderId: parcel.senderId, travelerId: proposal.travelerId,
          status, transportPrice: fees.transportPrice, platformFee: fees.platformFee, commissionRateBps: fees.commissionRateBps, travelerNet: fees.travelerNet, totalCharged: fees.totalCharged,
          currency: proposal.currency, weightGrams: parcel.weightGrams, volumeCm3: volume, acceptedAt: now,
        },
      });
      await tx.bookingStatusHistory.create({ data: { bookingId: booking.id, fromStatus: "PENDING", toStatus: status, actorId: user.id, reason: "Proposition acceptée", metadata: { feeModel } } });
      await tx.commission.create({ data: { bookingId: booking.id, rateBps: fees.commissionRateBps, amount: fees.platformFee, currency: booking.currency } });
      await tx.proposal.update({ where: { id: proposalId }, data: { status: "ACCEPTED", respondedAt: now } });
      const others = await tx.proposal.findMany({ where: { parcelId: parcel.id, status: "PENDING", id: { not: proposalId } }, select: { authorId: true, travelerId: true, tripId: true } });
      await tx.proposal.updateMany({ where: { parcelId: parcel.id, status: "PENDING", id: { not: proposalId } }, data: { status: "REJECTED", respondedAt: now } });
      await tx.parcel.update({ where: { id: parcel.id }, data: { status: "RESERVED" } });
      await addDeliveryEvent(tx, booking.id, "PARCEL_CREATED", parcel.senderId, { at: parcel.createdAt.toISOString() });
      await addDeliveryEvent(tx, booking.id, "TRAVELER_SELECTED", user.id);
      const conv = await ensureConversation(tx, [parcel.senderId, proposal.travelerId], { parcelId: parcel.id, tripId: proposal.tripId });
      await tx.conversation.update({ where: { id: conv.id }, data: { bookingId: booking.id } });

      await notify(tx, { userId: proposal.authorId, type: "PROPOSAL_ACCEPTED", title: `Proposition acceptée — ${booking.reference}`, body: needsVerification ? "Une vérification d'identité est nécessaire avant le paiement." : proposal.authorId === parcel.senderId ? "Le voyageur a accepté. Procédez au paiement pour confirmer." : "L'expéditeur a accepté. Il doit maintenant procéder au paiement.", link: `/tableau-de-bord/reservations/${booking.id}` });
      for (const o of others)
        await notify(tx, { userId: o.authorId, type: "PROPOSAL_REJECTED", title: "Colis réservé par un autre voyageur", body: `« ${parcel.title} » a été confié à un autre voyageur.`, link: o.authorId === o.travelerId ? `/tableau-de-bord/trajets/${o.tripId}` : `/tableau-de-bord/colis/${parcel.id}` });
      return booking;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw conflict("Ce colis vient d'être réservé.");
    throw e;
  }
}

export async function listMyProposals(userId: string) {
  return db.proposal.findMany({
    where: { OR: [{ travelerId: userId }, { parcel: { senderId: userId } }] },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { parcel: { include: { originCity: true, destCity: true } }, trip: { include: { originCity: true, destCity: true } }, booking: { select: { id: true, reference: true } } },
  });
}
