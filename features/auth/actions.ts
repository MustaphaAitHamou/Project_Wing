"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth/session";
import { action } from "@/server/security/action";
import { unauthenticated } from "@/server/security/errors";
import { safeNext } from "@/lib/safe-next";
import { phoneSchema, COUNTRY_OPTIONS } from "./schemas";

/** Premier passage d'un compte Google : acceptation des CGU et coordonnées manquantes. */
export const completeOnboarding = action(
  z.object({
    acceptTerms: z.literal(true, { message: "Vous devez accepter les conditions générales" }),
    phone: phoneSchema,
    countryCode: z.enum(COUNTRY_OPTIONS.map((c) => c.code) as [string, ...string[]]),
    next: z.string().optional(),
  }),
  async (input) => {
    const user = await getCurrentUser();
    if (!user) throw unauthenticated();
    await db.user.update({ where: { id: user.id }, data: { termsAcceptedAt: new Date(), phone: input.phone, countryCode: input.countryCode } });
    await db.userProfile.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
    redirect(safeNext(input.next));
  },
);
