"use client";
import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const subscribe = () => () => {};
/** Faux côté serveur et au premier rendu client, vrai ensuite : évite tout décalage d'hydratation. */
const useMounted = () => React.useSyncExternalStore(subscribe, () => true, () => false);

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  // Le thème réel n'est connu que dans le navigateur : libellé neutre tant que le composant n'est pas monté.
  const dark = mounted && resolvedTheme === "dark";
  return (
    <Button variant="ghost" size="icon" aria-label={mounted ? (dark ? "Passer au thème clair" : "Passer au thème sombre") : "Changer de thème"} onClick={() => setTheme(dark ? "light" : "dark")}>
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}
