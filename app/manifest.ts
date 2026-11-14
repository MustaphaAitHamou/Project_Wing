import type { MetadataRoute } from "next";

/** Fondations PWA : installation possible. Pas de notifications push à ce stade. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tamurt Transport",
    short_name: "Transport",
    description: "Envoyez vos colis avec des voyageurs entre la France et l'Algérie.",
    lang: "fr",
    start_url: "/tableau-de-bord",
    scope: "/",
    display: "standalone",
    background_color: "#f6f5f2",
    theme_color: "#0c7a70",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/brand/icone.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
