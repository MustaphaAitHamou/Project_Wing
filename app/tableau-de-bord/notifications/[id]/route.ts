import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { db } from "@/server/db/client";
import { safeNext } from "@/lib/safe-next";

/**
 * Ouverture d'une notification : la marque comme lue puis redirige vers sa cible.
 * Seul le destinataire peut la marquer ; la cible est forcément un chemin interne.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.redirect(new URL(`/connexion?next=/tableau-de-bord/notifications`, req.url));
  const n = await db.notification.findFirst({ where: { id, userId: session.user.id }, select: { link: true, readAt: true } });
  if (n && !n.readAt) await db.notification.update({ where: { id }, data: { readAt: new Date() } });
  return NextResponse.redirect(new URL(safeNext(n?.link, "/tableau-de-bord/notifications"), req.url));
}
