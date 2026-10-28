import { NextResponse, type NextRequest } from "next/server";

/**
 * En-têtes de sécurité appliqués à chaque page : CSP stricte avec nonce par requête
 * (les scripts injectés sans nonce sont bloqués), anti-clickjacking, etc.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const s3 = process.env.S3_PUBLIC_ORIGIN ?? "";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Les attributs style (Radix, animations) imposent 'unsafe-inline' pour les styles uniquement.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: https://lh3.googleusercontent.com ${s3}`.trim(),
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(process.env.APP_URL?.startsWith("https://") ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
