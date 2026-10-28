import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { signedUrl } from "@/server/storage";

/** Avatar public : redirige vers une URL signée courte. */
export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const p = await db.userProfile.findUnique({ where: { userId }, select: { avatarKey: true } });
  if (!p?.avatarKey) return new NextResponse(null, { status: 404 });
  const url = await signedUrl(p.avatarKey, 3600);
  return NextResponse.redirect(new URL(url, req.url), { headers: { "Cache-Control": "public, max-age=1800" } });
}
