"use client";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/lib/hooks/use-action";
import { markNotificationsReadAction } from "./actions";

export function MarkAllRead() {
  const a = useAction(markNotificationsReadAction, { success: "Tout est marqué comme lu" });
  return <Button variant="outline" loading={a.pending} onClick={() => a.run({ ids: "all" })}><CheckCheck />Tout marquer comme lu</Button>;
}
