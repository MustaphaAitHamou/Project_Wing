"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#f6f5f2", color: "#1d1b19" }}>
        <main style={{ textAlign: "center", padding: 24 }}>
          <h1>Tamurt Transport est momentanément indisponible</h1>
          <p>Merci de réessayer dans quelques instants.</p>
          <button onClick={reset} style={{ padding: "10px 18px", borderRadius: 10, border: 0, background: "#0c7a70", color: "white", fontWeight: 600 }}>Réessayer</button>
        </main>
      </body>
    </html>
  );
}
