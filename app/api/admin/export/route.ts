import { NextResponse, type NextRequest } from "next/server";
import { requireStaff } from "@/server/auth/session";
import { transactionsCsv } from "@/server/services/admin";
import { audit } from "@/server/audit";
import { AppError } from "@/server/security/errors";

export async function GET(req: NextRequest) {
  try {
    const staff = await requireStaff("ADMIN");
    const from = new Date(`${req.nextUrl.searchParams.get("from") ?? "2020-01-01"}T00:00:00Z`);
    const to = new Date(`${req.nextUrl.searchParams.get("to") ?? new Date().toISOString().slice(0, 10)}T23:59:59Z`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return NextResponse.json({ error: "dates invalides" }, { status: 400 });
    const csv = await transactionsCsv(from, to);
    await audit({ actorId: staff.id, action: "export.transactions", targetType: "Export", metadata: { from: from.toISOString(), to: to.toISOString() } });
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="transactions-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.httpStatus });
    throw e;
  }
}
