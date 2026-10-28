"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { useAction } from "@/lib/hooks/use-action";
import { setUserRoleAction } from "./actions";

export function RoleForm({ userId, current }: { userId: string; current: "USER" | "MODERATOR" | "ADMIN" }) {
  const [role, setRole] = React.useState(current);
  const [reason, setReason] = React.useState("");
  const a = useAction(setUserRoleAction, { success: "Rôle modifié (sessions de l'utilisateur révoquées)" });
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); void a.run({ userId, role, reason }); }}>
      <Field id="role" label="Rôle"><Select value={role} onChange={(e) => setRole(e.target.value as typeof role)}><option value="USER">Utilisateur</option><option value="MODERATOR">Modérateur</option><option value="ADMIN">Administrateur</option></Select></Field>
      <Field id="role-reason" label="Motif (journalisé)" error={a.fieldErrors.reason?.[0]}><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <Button type="submit" className="w-fit" disabled={role === current} loading={a.pending}>Appliquer</Button>
    </form>
  );
}
