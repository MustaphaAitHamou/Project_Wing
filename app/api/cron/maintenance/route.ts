import { NextResponse } from "next/server";
import { runMaintenance } from "@/server/jobs/scheduled";
import { isCronAuthorized } from "@/server/security/cron";

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await runMaintenance());
}
export const GET = POST;
