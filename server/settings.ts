import "server-only";
import { z } from "zod";
import { db, type Tx } from "@/server/db/client";
import { audit } from "@/server/audit";
import { MAX_COMMISSION_BPS } from "@/lib/domain/money";

/**
 * Paramètres plateforme modifiables depuis l'administration. Chaque clé a un
 * schéma et une valeur par défaut ; toute modification est validée et auditée.
 */
export const SETTINGS = {
  "commission.rateBps": { schema: z.number().int().min(0).max(MAX_COMMISSION_BPS), default: 1000, label: "Commission (points de base, 1000 = 10 %)" },
  "commission.feeModel": { schema: z.enum(["TRAVELER_DEDUCTION", "SENDER_SURCHARGE"]), default: "TRAVELER_DEDUCTION" as const, label: "Modèle de facturation" },
  "parcel.maxWeightGrams": { schema: z.number().int().min(100).max(100_000), default: 30_000, label: "Poids maximal d'un colis (g)" },
  "parcel.maxDeclaredValue": { schema: z.number().int().min(0), default: 100_000, label: "Valeur déclarée maximale (centimes)" },
  "parcel.expireAfterDays": { schema: z.number().int().min(1).max(365), default: 60, label: "Expiration des annonces (jours après la date souhaitée)" },
  "booking.autoCompleteDays": { schema: z.number().int().min(1).max(60), default: 7, label: "Clôture automatique après livraison (jours)" },
  "kyc.travelerRequired": { schema: z.boolean(), default: true, label: "Vérification d'identité obligatoire pour transporter" },
  "kyc.senderRequiredAboveValue": { schema: z.number().int().min(0), default: 50_000, label: "Vérification expéditeur au-delà de cette valeur déclarée (centimes)" },
  "notifications.emailEnabled": { schema: z.boolean(), default: true, label: "Emails transactionnels actifs" },
  "notifications.smsEnabled": { schema: z.boolean(), default: false, label: "SMS actifs (prestataire requis)" },
  "site.banner": { schema: z.object({ enabled: z.boolean(), message: z.string().max(300), tone: z.enum(["info", "warning"]) }), default: { enabled: false, message: "", tone: "info" as const }, label: "Bandeau d'information" },
  "payments.enabledProviders": { schema: z.array(z.enum(["local_sandbox", "stripe"])), default: ["local_sandbox", "stripe"] as ("local_sandbox" | "stripe")[], label: "Prestataires de paiement autorisés" },
} as const;

export type SettingKey = keyof typeof SETTINGS;
export type SettingValue<K extends SettingKey> = z.output<(typeof SETTINGS)[K]["schema"]>;

export async function getSetting<K extends SettingKey>(key: K, tx: Tx | typeof db = db): Promise<SettingValue<K>> {
  const row = await tx.platformSetting.findUnique({ where: { key } });
  const def = SETTINGS[key];
  if (!row) return def.default as SettingValue<K>;
  const parsed = def.schema.safeParse(row.value);
  return (parsed.success ? parsed.data : def.default) as SettingValue<K>;
}

export async function getAllSettings() {
  const rows = await db.platformSetting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return (Object.keys(SETTINGS) as SettingKey[]).map((key) => {
    const def = SETTINGS[key];
    const parsed = map.has(key) ? def.schema.safeParse(map.get(key)) : null;
    return { key, label: def.label, value: parsed?.success ? parsed.data : def.default, isDefault: !parsed?.success };
  });
}

export async function updateSetting(key: SettingKey, rawValue: unknown, actorId: string) {
  const def = SETTINGS[key];
  const value = def.schema.parse(rawValue);
  await db.$transaction(async (tx) => {
    const before = await tx.platformSetting.findUnique({ where: { key } });
    await tx.platformSetting.upsert({ where: { key }, create: { key, value: value as never, updatedById: actorId }, update: { value: value as never, updatedById: actorId } });
    await audit({ actorId, action: "settings.update", targetType: "PlatformSetting", targetId: key, metadata: { before: (before?.value ?? null) as never, after: value as never } }, tx);
  });
  return value;
}
