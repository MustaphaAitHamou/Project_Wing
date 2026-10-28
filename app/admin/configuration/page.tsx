import { db } from "@/server/db/client";
import { getAllSettings } from "@/server/settings";
import { requireStaffPage } from "@/server/auth/session";
import { PageHeader, Alert } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsEditor, CorridorEditor, CountryEditor, CategoryEditor, NewCorridor } from "@/features/admin/config-editors";
import { FEATURE_STATUS } from "@/lib/feature-status";
import { Badge } from "@/components/ui/badge";
import { Table, Td } from "@/features/admin/ui";

export default async function AdminConfig() {
  const staff = await requireStaffPage();
  const isAdmin = staff.role === "ADMIN";
  const [settings, corridors, countries, categories] = await Promise.all([
    getAllSettings(),
    db.corridor.findMany({ include: { origin: true, destination: true }, orderBy: [{ originCountry: "asc" }, { destCountry: "asc" }] }),
    db.country.findMany({ orderBy: { name: "asc" } }),
    db.parcelCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <div className="grid gap-8">
      <PageHeader title="Configuration" description="Toute modification est validée côté serveur et enregistrée dans le journal d'audit." />
      {!isAdmin && <Alert tone="info">Lecture seule : seuls les administrateurs peuvent modifier la configuration.</Alert>}
      <Card>
        <CardHeader><CardTitle>État des fonctionnalités</CardTitle><p className="text-sm text-muted-foreground">Distinction entre ce qui est implémenté, validé en test et réellement activé.</p></CardHeader>
        <CardContent>
          <Table head={["Fonction", "Implémentée", "Testée", "Activée en production", "Condition"]} minWidth="48rem">
            {FEATURE_STATUS.map((f) => (
              <tr key={f.name}><Td className="font-medium">{f.name}</Td><Td>{f.implemented ? "Oui" : "Non"}</Td><Td>{f.tested ? "Oui" : "Non"}</Td><Td><Badge tone={f.live === "yes" ? "success" : f.live === "blocked" ? "danger" : "warning"}>{f.live === "yes" ? "Oui" : f.live === "blocked" ? "Bloquée" : "À activer"}</Badge></Td><Td className="text-xs text-muted-foreground">{f.condition}</Td></tr>
            ))}
          </Table>
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Paramètres de la plateforme</CardTitle></CardHeader><CardContent><SettingsEditor settings={settings} readOnly={!isAdmin} /></CardContent></Card>
      <Card>
        <CardHeader><CardTitle>Corridors de transport</CardTitle><p className="text-sm text-muted-foreground">DISABLED : fermé. TEST_ONLY : utilisable hors production uniquement. LIVE : ouvert au public, après validation juridique et opérationnelle.</p></CardHeader>
        <CardContent className="grid gap-4">
          {corridors.map((c) => <CorridorEditor key={c.id} readOnly={!isAdmin} corridor={{ id: c.id, label: `${c.origin.name} → ${c.destination.name}`, status: c.status, allowedModes: c.allowedModes, maxWeightKg: c.maxWeightGrams / 1000, notes: c.notes ?? "" }} />)}
          {isAdmin && <NewCorridor countries={countries.map((c) => ({ code: c.code, name: c.name }))} />}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Pays</CardTitle><p className="text-sm text-muted-foreground">« Versements » ne doit être activé qu&apos;après confirmation écrite du prestataire de paiement pour les comptes de ce pays.</p></CardHeader>
        <CardContent className="grid gap-2">{countries.map((c) => <CountryEditor key={c.code} readOnly={!isAdmin} country={{ code: c.code, name: c.name, isActive: c.isActive, payoutsEnabled: c.payoutsEnabled }} />)}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Catégories de colis</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {categories.map((c) => <CategoryEditor key={c.id} readOnly={!isAdmin} category={{ id: c.id, name: c.name, description: c.description ?? "", isActive: c.isActive, isProhibited: c.isProhibited, requiresReview: c.requiresReview, allowedModes: c.allowedModes, sortOrder: c.sortOrder }} />)}
          {isAdmin && <CategoryEditor category={null} />}
        </CardContent>
      </Card>
    </div>
  );
}
