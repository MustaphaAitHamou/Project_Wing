import { NextResponse } from "next/server";
import { drainJobs } from "@/server/jobs/runner";
import { isCronAuthorized } from "@/server/security/cron";

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ processed: await drainJobs(200) });
}
export const GET = POST;
