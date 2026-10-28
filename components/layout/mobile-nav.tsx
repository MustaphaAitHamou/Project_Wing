"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PUBLIC_NAV } from "./nav-links";
import { cn } from "@/lib/utils";

export function MobileNav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir le menu">
          <Menu className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent title="Menu" side="right" className="content-start">
        <nav className="grid gap-1" aria-label="Navigation principale" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
          <Link href="/" className={cn("rounded-lg px-3 py-3 text-base font-medium hover:bg-muted", pathname === "/" && "bg-muted")}>Accueil</Link>
          {PUBLIC_NAV.map((l) => (
            <Link key={l.href} href={l.href} className={cn("rounded-lg px-3 py-3 text-base font-medium hover:bg-muted", pathname.startsWith(l.href) && "bg-muted")}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="grid gap-2 border-t pt-4" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
          {signedIn ? (
            <Button asChild><Link href="/tableau-de-bord">Mon tableau de bord</Link></Button>
          ) : (
            <>
              <Button asChild><Link href="/inscription">Créer un compte</Link></Button>
              <Button asChild variant="outline"><Link href="/connexion">Se connecter</Link></Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
