import type { MetadataRoute } from "next";

/** Fondations PWA : installation possible. Pas de notifications push à ce stade. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tamurt Sending",
    short_name: "Tamurt",
    description: "Envoyez vos colis avec des voyageurs entre la France et l'Algérie.",
    lang: "fr",
    start_url: "/tableau-de-bord",
    scope: "/",
    display: "standalone",
    background_color: "#f7faf9",
    theme_color: "#0f5c4d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
