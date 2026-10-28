import { NextResponse, type NextRequest } from "next/server";
import { readLocalSigned } from "@/server/storage";

/** Sert un fichier du stockage local via URL signée et expirante (driver local uniquement). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const file = await readLocalSigned(sp.get("key") ?? "", Number(sp.get("exp")), sp.get("sig") ?? "");
  if (!file) return new NextResponse("Lien invalide ou expiré", { status: 403 });
  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": file.mime === "application/pdf" ? "attachment" : "inline",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
