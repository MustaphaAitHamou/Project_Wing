import { NextResponse, type NextRequest } from "next/server";
import { searchCities } from "@/server/services/geo";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 60);
  const country = req.nextUrl.searchParams.get("country");
  const cities = await searchCities(q, country && /^[A-Z]{2}$/.test(country) ? country : undefined);
  return NextResponse.json(cities, { headers: { "Cache-Control": "public, max-age=300" } });
}
