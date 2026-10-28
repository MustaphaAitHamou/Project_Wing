"use client";
import * as React from "react";
import { DropdownMenu as M } from "radix-ui";
import { cn } from "@/lib/utils";

export const Dropdown = M.Root;
export const DropdownTrigger = M.Trigger;

export function DropdownContent({ className, children, align = "end" }: { className?: string; children: React.ReactNode; align?: "start" | "end" | "center" }) {
  return (
    <M.Portal>
      <M.Content align={align} sideOffset={8} className={cn("z-50 min-w-56 rounded-xl border bg-card p-1.5 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", className)}>
        {children}
      </M.Content>
    </M.Portal>
  );
}

export function DropdownItem({ className, ...p }: React.ComponentProps<typeof M.Item>) {
  return <M.Item className={cn("flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-muted [&_svg]:size-4 [&_svg]:text-muted-foreground", className)} {...p} />;
}

export const DropdownSeparator = () => <M.Separator className="my-1 h-px bg-border" />;
export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return <M.Label className="px-2.5 py-1.5 text-xs text-muted-foreground">{children}</M.Label>;
}
