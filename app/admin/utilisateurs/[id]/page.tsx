import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserAdmin } from "@/server/services/admin";
import { requireStaffPage } from "@/server/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { RunAction } from "@/features/admin/run-action";
import { RoleForm } from "@/features/admin/role-form";
import { setUserStatusAction } from "@/features/admin/actions";
import { formatDateTime } from "@/lib/utils";

export default async function AdminUser({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await requireStaffPage();
  const u = await getUserAdmin(id);
  if (!u) notFound();
  const rating = u.profile?.ratingCount ? (u.profile.ratingSum / u.profile.ratingCount).toFixed(1) : "-";
  return (
    <div className="grid gap-6">
      <PageHeader title={`${u.firstName} ${u.lastName}`} description={`${u.email} · ${u.phone ?? "sans téléphone"} · ${u.countryCode ?? "pays non renseigné"}`} eyebrow={<div className="flex gap-2"><Badge tone="accent">{u.role}</Badge><Badge tone={u.status === "ACTIVE" ? "success" : "danger"}>{u.status}</Badge></div>}
        actions={staff.id !== u.id && (u.status === "ACTIVE"
          ? <RunAction fn={setUserStatusAction} payload={{ userId: u.id, suspend: true }} label="Suspendre le compte" confirm="Suspendre ce compte ? Ses sessions, annonces et propositions seront désactivées." reason destructive success="Compte suspendu" />
          : <RunAction fn={setUserStatusAction} payload={{ userId: u.id, suspend: false }} label="Réactiver" confirm="Réactiver ce compte ?" reason success="Compte réactivé" />)} />
      {u.status === "SUSPENDED" && <Alert tone="danger">Suspendu : {u.suspendedReason}</Alert>}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>Profil et confiance</CardTitle></CardHeader><CardContent className="grid gap-1 text-sm">
          <p>Inscrit le {formatDateTime(u.createdAt)} · email {u.emailVerified ? "confirmé" : "non confirmé"} · 2FA {u.twoFactorEnabled ? "activée" : "désactivée"}</p>
          <p>Identité : <strong>{u.profile?.kycStatus}</strong> · note {rating} ({u.profile?.ratingCount ?? 0} avis) · {u.profile?.deliveriesCount ?? 0} livraisons · {u.profile?.shipmentsCount ?? 0} envois</p>
          {u.identityChecks.map((v) => <p key={v.id} className="text-xs text-muted-foreground">KYC {v.provider} · {v.status} · {formatDateTime(v.createdAt)}{v.failureReason ? ` · ${v.failureReason}` : ""}</p>)}
          {u.payoutAccounts.map((a) => <p key={a.id} className="text-xs text-muted-foreground">Compte de versement {a.provider} ({a.countryCode}) · {a.payoutsEnabled ? "actif" : "inactif"}</p>)}
        </CardContent></Card>
        {staff.role === "ADMIN" && staff.id !== u.id && <Card><CardHeader><CardTitle>Rôle</CardTitle></CardHeader><CardContent><RoleForm userId={u.id} current={u.role} /></CardContent></Card>}
        <Card><CardHeader><CardTitle>Réservations</CardTitle></CardHeader><CardContent className="grid gap-1 text-sm">{u.bookings.length === 0 ? <p className="text-muted-foreground">Aucune.</p> : u.bookings.map((b) => <p key={b.id}><Link href={`/admin/reservations?q=${b.reference}`} className="font-mono hover:underline">{b.reference}</Link> · {b.senderId === u.id ? "expéditeur" : "voyageur"} · {b.status}</p>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Annonces</CardTitle></CardHeader><CardContent className="grid gap-1 text-sm">
          {u.parcels.map((p) => <p key={p.id}>Colis · <Link href={`/admin/annonces?q=${p.id}`} className="hover:underline">{p.title}</Link> · {p.status}</p>)}
          {u.trips.map((t) => <p key={t.id}>Trajet · {t.originCity.name} → {t.destCity.name} · {t.status}</p>)}
          {u.parcels.length + u.trips.length === 0 && <p className="text-muted-foreground">Aucune.</p>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Signalements reçus</CardTitle></CardHeader><CardContent className="grid gap-1 text-sm">{u.reports.length === 0 ? <p className="text-muted-foreground">Aucun.</p> : u.reports.map((r) => <p key={r.id}>{r.reason} · {r.status} · {formatDateTime(r.createdAt)}</p>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Historique (audit)</CardTitle></CardHeader><CardContent className="grid gap-1 text-xs">{u.logs.length === 0 ? <p className="text-muted-foreground">Aucun événement.</p> : u.logs.map((l) => <p key={l.id} className="font-mono">{formatDateTime(l.createdAt)} · {l.action}{l.actorId === u.id ? " (par l'utilisateur)" : ""}</p>)}</CardContent></Card>
      </div>
    </div>
  );
}
