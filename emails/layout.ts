export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** Gabarit HTML compatible clients mail (tables, styles inline). */
export function layout(opts: { title: string; preheader: string; paragraphs: string[]; cta?: { label: string; url: string }; code?: string; footer?: string }): Omit<RenderedEmail, "subject"> {
  const p = opts.paragraphs.map((x) => `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#1f2433">${escapeHtml(x)}</p>`).join("");
  const code = opts.code
    ? `<p style="margin:8px 0 24px;font:700 32px/40px ui-monospace,Menlo,monospace;letter-spacing:8px;color:#0b5c4a">${escapeHtml(opts.code)}</p>`
    : "";
  const cta = opts.cta
    ? `<p style="margin:8px 0 24px"><a href="${escapeHtml(opts.cta.url)}" style="display:inline-block;background:#0b5c4a;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">${escapeHtml(opts.cta.label)}</a></p>
       <p style="margin:0 0 16px;font-size:13px;color:#5b6170">Si le bouton ne fonctionne pas, copiez ce lien : <br><span style="word-break:break-all">${escapeHtml(opts.cta.url)}</span></p>`
    : "";
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(opts.title)}</title></head>
<body style="margin:0;background:#f3f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px" cellpadding="0" cellspacing="0"><tr><td style="padding:32px">
<p style="margin:0 0 24px;font-weight:800;font-size:18px;color:#0b5c4a">Tamurt Sending</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:30px;color:#1f2433">${escapeHtml(opts.title)}</h1>
${p}${code}${cta}
<p style="margin:24px 0 0;font-size:12px;color:#8a8f9c">${escapeHtml(opts.footer ?? "Vous recevez cet email car vous avez un compte Tamurt Sending. Ne transférez jamais un code de confirmation à un tiers.")}</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = [opts.title, "", ...opts.paragraphs, opts.code ? `\nCode : ${opts.code}\n` : "", opts.cta ? `${opts.cta.label} : ${opts.cta.url}` : ""].join("\n");
  return { html, text };
}
