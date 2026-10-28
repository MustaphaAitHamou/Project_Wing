"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#f7faf9", color: "#1f2433" }}>
        <main style={{ textAlign: "center", padding: 24 }}>
          <h1>Tamurt Sending est momentanément indisponible</h1>
          <p>Merci de réessayer dans quelques instants.</p>
          <button onClick={reset} style={{ padding: "10px 18px", borderRadius: 10, border: 0, background: "#0f5c4d", color: "white", fontWeight: 600 }}>Réessayer</button>
        </main>
      </body>
    </html>
  );
}
