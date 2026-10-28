/**
 * Worker intégré : sur un serveur Node.js persistant, traite la file de tâches toutes les
 * 5 secondes (filet de sécurité si un déclenchement après requête est perdu) et lance la
 * maintenance toutes les heures. Désactivable avec INLINE_JOB_WORKER=false (ex. hébergement
 * serverless : utiliser alors les routes /api/cron/*).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.INLINE_JOB_WORKER === "false") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { runDueJobs } = await import("./server/jobs/runner");
  const { runMaintenance } = await import("./server/jobs/scheduled");
  let busy = false;
  let lastMaintenance = Date.now();
  setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      await runDueJobs(50);
      if (Date.now() - lastMaintenance > 3_600_000) {
        lastMaintenance = Date.now();
        await runMaintenance();
      }
    } catch (e) {
      console.error(JSON.stringify({ level: "error", event: "inline_worker.failed", error: e instanceof Error ? e.message : String(e) }));
    } finally {
      busy = false;
    }
  }, 5_000).unref();
}
