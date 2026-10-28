import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/tableau-de-bord", "/admin", "/api", "/dev", "/scan", "/connexion", "/inscription", "/profil"] }],
    sitemap: `${env.APP_URL}/sitemap.xml`,
  };
}
