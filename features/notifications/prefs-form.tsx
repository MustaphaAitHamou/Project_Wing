"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/input";
import { useAction } from "@/lib/hooks/use-action";
import { updateNotificationPrefsAction } from "./actions";

export function NotificationPrefsForm({ rows }: { rows: { type: string; label: string; inApp: boolean; email: boolean }[] }) {
  const [prefs, setPrefs] = React.useState(Object.fromEntries(rows.map((r) => [r.type, { inApp: r.inApp, email: r.email }])));
  const save = useAction(updateNotificationPrefsAction, { success: "Préférences enregistrées" });
  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground"><tr><th className="p-3 font-medium">Événement</th><th className="p-3 text-center font-medium">Application</th><th className="p-3 text-center font-medium">Email</th></tr></thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.type}>
                <td className="p-3">{r.label}</td>
                {(["inApp", "email"] as const).map((ch) => (
                  <td key={ch} className="p-3 text-center"><Checkbox aria-label={`${r.label} : ${ch === "inApp" ? "application" : "email"}`} checked={prefs[r.type]![ch]} onChange={(e) => setPrefs((p) => ({ ...p, [r.type]: { ...p[r.type]!, [ch]: e.target.checked } }))} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button className="w-fit" loading={save.pending} onClick={() => save.run({ prefs })}>Enregistrer</Button>
    </div>
  );
}
