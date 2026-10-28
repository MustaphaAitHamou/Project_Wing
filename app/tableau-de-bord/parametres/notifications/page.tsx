import type { Metadata } from "next";
import { requireUserPage } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { NOTIFICATION_PREF_TYPES, resolvePref } from "@/server/services/notifications";
import { PageHeader, Alert } from "@/components/ui/misc";
import { NotificationPrefsForm } from "@/features/notifications/prefs-form";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = { title: "Préférences de notification" };

export default async function NotificationPrefsPage() {
  const user = await requireUserPage("/tableau-de-bord/parametres/notifications");
  const [p, sms] = await Promise.all([db.userProfile.findUnique({ where: { userId: user.id }, select: { notificationPrefs: true } }), getSetting("notifications.smsEnabled")]);
  const rows = NOTIFICATION_PREF_TYPES.map((t) => ({ ...t, ...resolvePref(p?.notificationPrefs, t.type) }));
  return (
    <div className="grid max-w-2xl gap-6">
      <PageHeader title="Notifications" description="Choisissez comment être prévenu. Les emails de sécurité (codes, mot de passe) sont toujours envoyés." />
      <NotificationPrefsForm rows={rows} />
      <Alert tone="info">SMS : {sms ? "disponibles pour les codes de réception destinataires." : "non disponibles pour le moment."} Notifications push : pas encore disponibles.</Alert>
    </div>
  );
}
