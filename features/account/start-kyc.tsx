"use client";
import { Button } from "@/components/ui/button";
import { useAction } from "@/lib/hooks/use-action";
import { startKycAction } from "./actions";

export function StartKycButton({ label }: { label: string }) {
  const a = useAction(startKycAction, { refresh: false, onSuccess: (d) => { window.location.href = d.url; } });
  return <Button size="lg" className="w-fit" loading={a.pending} onClick={() => a.run({})}>{label}</Button>;
}
