/**
 * Worker de file de tâches (alternative au cron HTTP) :
 *   pnpm jobs:run          → boucle continue
 *   pnpm jobs:run --once   → un passage puis sortie
 */
import "dotenv/config";

async function main() {
  const { runDueJobs } = await import("../server/jobs/runner");
  const { runMaintenance } = await import("../server/jobs/scheduled");
  const once = process.argv.includes("--once");
  let lastMaintenance = 0;
  do {
    const r = await runDueJobs(50);
    if (r.processed) console.log(`[jobs] ${r.processed} traitée(s), ${r.failed} échec(s)`);
    if (Date.now() - lastMaintenance > 3600_000) {
      console.log("[maintenance]", await runMaintenance());
      lastMaintenance = Date.now();
    }
    if (!once) await new Promise((res) => setTimeout(res, r.processed ? 200 : 5000));
  } while (!once);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
