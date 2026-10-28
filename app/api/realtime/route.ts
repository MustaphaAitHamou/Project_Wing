import { Client } from "pg";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { env } from "@/lib/env";
import { REALTIME_CHANNEL } from "@/server/services/messaging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Flux temps réel (Server-Sent Events) alimenté par PostgreSQL LISTEN/NOTIFY.
 * Chaque événement n'est transmis qu'aux utilisateurs listés comme destinataires.
 * Une connexion PostgreSQL dédiée par client connecté : adapté au lancement ;
 * au-delà de quelques centaines de connexions simultanées, passer à un service
 * dédié (voir docs/ARCHITECTURE.md).
 */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("unauthorized", { status: 401 });
  const userId = session.user.id;
  const pg = new Client({ connectionString: env.DATABASE_URL });
  await pg.connect();
  await pg.query(`LISTEN ${REALTIME_CHANNEL}`);
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      send("ready", {});
      pg.on("notification", (n) => {
        try {
          const p = JSON.parse(n.payload ?? "{}") as { kind: string; conversationId?: string; userIds?: string[] };
          if (p.userIds?.includes(userId)) send(p.kind, { conversationId: p.conversationId });
        } catch {
          // charge utile invalide ignorée
        }
      });
      const ping = setInterval(() => controller.enqueue(enc.encode(": ping\n\n")), 25_000);
      const close = () => {
        clearInterval(ping);
        pg.end().catch(() => undefined);
        try {
          controller.close();
        } catch {
          // déjà fermé
        }
      };
      req.signal.addEventListener("abort", close);
      // Reconnexion forcée toutes les 10 minutes (EventSource se reconnecte seul).
      setTimeout(close, 10 * 60_000);
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
}
