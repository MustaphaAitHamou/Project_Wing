/** Illustration originale : un trajet en arc au-dessus de la Méditerranée, de la France à la Kabylie. */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 360" className={className} role="img" aria-label="Un colis voyage de la France vers la Kabylie avec un voyageur">
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--primary-soft)" />
          <stop offset="1" stopColor="var(--background)" />
        </linearGradient>
      </defs>
      <rect x="10" y="20" width="400" height="320" rx="36" fill="url(#sea)" />
      {/* côtes stylisées */}
      <path d="M10 112c40-6 70 6 100-4s48-28 84-24 52 22 86 18 60-20 130-14V56a36 36 0 0 0-36-36H46A36 36 0 0 0 10 56z" fill="var(--card)" opacity=".9" />
      <path d="M10 268c38 6 62-10 98-6s54 22 92 18 58-24 98-20 70 18 112 12v32a36 36 0 0 1-36 36H46a36 36 0 0 1-36-36z" fill="var(--card)" opacity=".9" />
      {/* montagnes (Djurdjura) */}
      <path d="M232 300l26-34 18 20 20-28 30 42z" fill="var(--primary)" opacity=".18" />
      {/* trajet */}
      <path d="M96 92C120 190 250 160 296 262" fill="none" stroke="var(--primary)" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
      <circle cx="96" cy="88" r="9" fill="var(--primary)" />
      <circle cx="96" cy="88" r="17" fill="none" stroke="var(--primary)" opacity=".3" strokeWidth="2" />
      <circle cx="296" cy="266" r="9" fill="var(--accent)" />
      <circle cx="296" cy="266" r="17" fill="none" stroke="var(--accent)" opacity=".45" strokeWidth="2" />
      <text x="116" y="80" fontSize="13" fontWeight="700" fill="var(--foreground)">Marseille</text>
      <text x="230" y="300" fontSize="13" fontWeight="700" fill="var(--foreground)" textAnchor="end" dx="-6">Béjaïa</text>
      {/* colis en vol */}
      <g transform="translate(176 150) rotate(-8)">
        <rect x="-34" y="-26" width="68" height="52" rx="8" fill="var(--card)" stroke="var(--primary)" strokeWidth="2.5" />
        <path d="M-34 -6h68M0 -26v52" stroke="var(--primary)" strokeWidth="2.5" opacity=".55" />
        <path d="M0 6l7 7-7 7-7-7z" fill="var(--accent)" />
      </g>
      {/* code de confirmation */}
      <g transform="translate(296 128)">
        <rect x="-58" y="-24" width="116" height="48" rx="14" fill="var(--card)" stroke="var(--border)" />
        <text x="0" y="-4" fontSize="9" fill="var(--muted-foreground)" textAnchor="middle" letterSpacing="1">CODE DE REMISE</text>
        <text x="0" y="14" fontSize="17" fontWeight="800" fill="var(--primary)" textAnchor="middle" letterSpacing="5">• • • • • •</text>
      </g>
    </svg>
  );
}
