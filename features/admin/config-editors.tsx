"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { useAction } from "@/lib/hooks/use-action";
import { TRANSPORT_MODES, TRANSPORT_MODE_LABELS } from "@/features/shared/schemas";
import { createCorridorAction, updateCategoryOrCreate, updateCorridorAction, updateCountryAction, updateSettingAction } from "./config-actions-bridge";

type Setting = { key: string; label: string; value: unknown; isDefault: boolean };

function SettingRow({ s, readOnly }: { s: Setting; readOnly?: boolean }) {
  const a = useAction(updateSettingAction, { success: "Paramètre enregistré" });
  const [v, setV] = React.useState<unknown>(s.value);
  let input: React.ReactNode;
  if (typeof s.value === "boolean") input = <label className="flex items-center gap-2 text-sm"><Checkbox checked={v as boolean} disabled={readOnly} onChange={(e) => setV(e.target.checked)} />Activé</label>;
  else if (typeof s.value === "number") input = <Input type="number" value={String(v)} disabled={readOnly} onChange={(e) => setV(Number(e.target.value))} className="max-w-48" />;
  else if (s.key === "commission.feeModel") input = <Select value={v as string} disabled={readOnly} onChange={(e) => setV(e.target.value)} className="max-w-sm"><option value="TRAVELER_DEDUCTION">Commission retenue sur le voyageur</option><option value="SENDER_SURCHARGE">Commission ajoutée au prix expéditeur</option></Select>;
  else if (Array.isArray(s.value)) input = <div className="flex gap-4 text-sm">{["local_sandbox", "stripe"].map((p) => <label key={p} className="flex items-center gap-2"><Checkbox disabled={readOnly} checked={(v as string[]).includes(p)} onChange={(e) => setV(e.target.checked ? [...(v as string[]), p] : (v as string[]).filter((x) => x !== p))} />{p}</label>)}</div>;
  else {
    const b = v as { enabled: boolean; message: string; tone: "info" | "warning" };
    input = (
      <div className="grid gap-2">
        <label className="flex items-center gap-2 text-sm"><Checkbox disabled={readOnly} checked={b.enabled} onChange={(e) => setV({ ...b, enabled: e.target.checked })} />Afficher</label>
        <Input value={b.message} disabled={readOnly} maxLength={300} onChange={(e) => setV({ ...b, message: e.target.value })} placeholder="Message du bandeau" />
        <Select value={b.tone} disabled={readOnly} onChange={(e) => setV({ ...b, tone: e.target.value })} className="max-w-48"><option value="info">Information</option><option value="warning">Avertissement</option></Select>
      </div>
    );
  }
  return (
    <div className="grid gap-2 border-b py-4 last:border-0 sm:grid-cols-[1fr_1.4fr_auto] sm:items-center">
      <div><p className="text-sm font-medium">{s.label}</p><p className="font-mono text-xs text-muted-foreground">{s.key}{s.isDefault ? " (valeur par défaut)" : ""}</p></div>
      <div>{input}</div>
      {!readOnly && <Button size="sm" variant="outline" loading={a.pending} onClick={() => a.run({ key: s.key, value: v })}>Enregistrer</Button>}
    </div>
  );
}

export function SettingsEditor({ settings, readOnly }: { settings: Setting[]; readOnly?: boolean }) {
  return <div>{settings.map((s) => <SettingRow key={s.key} s={s} readOnly={readOnly} />)}</div>;
}

function ModesPicker({ value, onChange, disabled }: { value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  return <div className="flex flex-wrap gap-3 text-sm">{TRANSPORT_MODES.map((m) => <label key={m} className="flex items-center gap-1.5"><Checkbox disabled={disabled} checked={value.includes(m)} onChange={(e) => onChange(e.target.checked ? [...value, m] : value.filter((x) => x !== m))} />{TRANSPORT_MODE_LABELS[m]}</label>)}</div>;
}

export function CorridorEditor({ corridor, readOnly }: { corridor: { id: string; label: string; status: string; allowedModes: string[]; maxWeightKg: number; notes: string }; readOnly?: boolean }) {
  const [v, setV] = React.useState(corridor);
  const [confirmLegal, setConfirmLegal] = React.useState(false);
  const a = useAction(updateCorridorAction, { success: "Corridor mis à jour" });
  return (
    <div className="grid gap-3 rounded-xl border p-4">
      <p className="font-semibold">{corridor.label}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`st-${v.id}`} label="Statut"><Select value={v.status} disabled={readOnly} onChange={(e) => setV({ ...v, status: e.target.value })}><option value="DISABLED">Fermé</option><option value="TEST_ONLY">Test uniquement</option><option value="LIVE">Ouvert (LIVE)</option></Select></Field>
        <Field id={`mw-${v.id}`} label="Poids max par colis (kg)"><Input type="number" disabled={readOnly} value={v.maxWeightKg} onChange={(e) => setV({ ...v, maxWeightKg: Number(e.target.value) })} /></Field>
      </div>
      <ModesPicker value={v.allowedModes} disabled={readOnly} onChange={(m) => setV({ ...v, allowedModes: m })} />
      <Field id={`nt-${v.id}`} label="Notes"><Input disabled={readOnly} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field>
      {!readOnly && v.status === "LIVE" && corridor.status !== "LIVE" && <label className="flex items-start gap-2 text-sm"><Checkbox className="mt-0.5" checked={confirmLegal} onChange={(e) => setConfirmLegal(e.target.checked)} />Je confirme que la validation juridique (douanes, statut des voyageurs, responsabilité, assurance) et opérationnelle de ce corridor a été réalisée.</label>}
      {!readOnly && <Button size="sm" className="w-fit" loading={a.pending} onClick={() => a.run({ id: v.id, status: v.status as never, allowedModes: v.allowedModes as never, maxWeightKg: v.maxWeightKg, notes: v.notes, confirmLegal })}>Enregistrer</Button>}
    </div>
  );
}

export function NewCorridor({ countries }: { countries: { code: string; name: string }[] }) {
  const [o, setO] = React.useState("FR");
  const [d, setD] = React.useState("BE");
  const a = useAction(createCorridorAction, { success: "Corridor créé (fermé par défaut)" });
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field id="nc-o" label="Nouveau corridor : départ"><Select value={o} onChange={(e) => setO(e.target.value)}>{countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</Select></Field>
      <Field id="nc-d" label="arrivée"><Select value={d} onChange={(e) => setD(e.target.value)}>{countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</Select></Field>
      <Button variant="outline" loading={a.pending} disabled={o === d} onClick={() => a.run({ originCountry: o, destCountry: d })}>Créer</Button>
    </div>
  );
}

export function CountryEditor({ country, readOnly }: { country: { code: string; name: string; isActive: boolean; payoutsEnabled: boolean }; readOnly?: boolean }) {
  const [v, setV] = React.useState(country);
  const [confirm, setConfirm] = React.useState(false);
  const a = useAction(updateCountryAction, { success: "Pays mis à jour" });
  const changed = v.isActive !== country.isActive || v.payoutsEnabled !== country.payoutsEnabled;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b py-2 text-sm last:border-0">
      <span className="w-32 font-medium">{country.name} <span className="text-muted-foreground">({country.code})</span></span>
      <label className="flex items-center gap-2"><Checkbox disabled={readOnly} checked={v.isActive} onChange={(e) => setV({ ...v, isActive: e.target.checked })} />Actif (villes proposées)</label>
      <label className="flex items-center gap-2"><Checkbox disabled={readOnly} checked={v.payoutsEnabled} onChange={(e) => setV({ ...v, payoutsEnabled: e.target.checked })} />Versements disponibles</label>
      {!readOnly && v.payoutsEnabled && !country.payoutsEnabled && <label className="flex items-center gap-2 text-warning"><Checkbox checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />Prise en charge confirmée par le prestataire</label>}
      {!readOnly && changed && <Button size="sm" variant="outline" loading={a.pending} onClick={() => a.run({ code: v.code, isActive: v.isActive, payoutsEnabled: v.payoutsEnabled, confirmProvider: confirm })}>Enregistrer</Button>}
    </div>
  );
}

export function CategoryEditor({ category, readOnly }: { category: { id: string; name: string; description: string; isActive: boolean; isProhibited: boolean; requiresReview: boolean; allowedModes: string[]; sortOrder: number } | null; readOnly?: boolean }) {
  const [v, setV] = React.useState(category ?? { id: "", name: "", description: "", isActive: true, isProhibited: false, requiresReview: false, allowedModes: [] as string[], sortOrder: 50 });
  const a = useAction(updateCategoryOrCreate, { success: category ? "Catégorie mise à jour" : "Catégorie créée", onSuccess: () => { if (!category) setV({ id: "", name: "", description: "", isActive: true, isProhibited: false, requiresReview: false, allowedModes: [], sortOrder: 50 }); } });
  return (
    <details className="rounded-xl border p-3" open={!category}>
      <summary className="cursor-pointer text-sm font-medium">{category ? `${category.name}${category.isProhibited ? " · interdite" : category.requiresReview ? " · validation requise" : ""}${category.isActive ? "" : " · inactive"}` : "Nouvelle catégorie"}</summary>
      <div className="mt-3 grid gap-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <Field id={`cn-${v.id}`} label="Nom"><Input disabled={readOnly} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
          <Field id={`co-${v.id}`} label="Ordre"><Input type="number" disabled={readOnly} value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: Number(e.target.value) })} /></Field>
        </div>
        <Field id={`cd-${v.id}`} label="Description"><Input disabled={readOnly} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><Checkbox disabled={readOnly} checked={v.isActive} onChange={(e) => setV({ ...v, isActive: e.target.checked })} />Active</label>
          <label className="flex items-center gap-2"><Checkbox disabled={readOnly} checked={v.isProhibited} onChange={(e) => setV({ ...v, isProhibited: e.target.checked })} />Interdite</label>
          <label className="flex items-center gap-2"><Checkbox disabled={readOnly} checked={v.requiresReview} onChange={(e) => setV({ ...v, requiresReview: e.target.checked })} />Validation manuelle</label>
        </div>
        <p className="text-xs text-muted-foreground">Moyens de transport autorisés (aucun coché = tous) :</p>
        <ModesPicker value={v.allowedModes} disabled={readOnly} onChange={(m) => setV({ ...v, allowedModes: m })} />
        {!readOnly && <Button size="sm" className="w-fit" loading={a.pending} onClick={() => a.run({ ...v, allowedModes: v.allowedModes as never, id: v.id || undefined, description: v.description || undefined })}>Enregistrer</Button>}
      </div>
    </details>
  );
}
