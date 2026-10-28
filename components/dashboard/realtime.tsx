"use client";
import * as React from "react";
import { useRouter } from "next/navigation";

/** Écoute le flux temps réel et rafraîchit les données serveur (badges, fil de discussion). */
export function RealtimeRefresher() {
  const router = useRouter();
  React.useEffect(() => {
    let es: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const connect = () => {
      es = new EventSource("/api/realtime");
      es.addEventListener("message", (e) => {
        const data = JSON.parse((e as MessageEvent).data || "{}");
        window.dispatchEvent(new CustomEvent("tamurt:message", { detail: data }));
        clearTimeout(timer);
        timer = setTimeout(() => router.refresh(), 300);
      });
    };
    connect();
    return () => {
      clearTimeout(timer);
      es?.close();
    };
  }, [router]);
  return null;
}
