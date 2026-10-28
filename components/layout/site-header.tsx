import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getCurrentUser, isStaff } from "@/server/auth/session";
import { unreadCount } from "@/server/services/notifications";
import { PUBLIC_NAV } from "./nav-links";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "./theme-toggle";
import { SiteBanner } from "./site-banner";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const unread = user ? await unreadCount(user.id) : 0;
  return (
    <>
      <SiteBanner />
      <header className="sticky top-0 z-40 border-b bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="container-page flex h-16 items-center gap-4">
          <Link href="/" aria-label="Tamurt Sending, accueil" className="shrink-0">
            <Logo />
          </Link>
          <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
            {PUBLIC_NAV.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            {user ? (
              <>
                <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex"><Link href="/tableau-de-bord">Tableau de bord</Link></Button>
                <UserMenu name={user.name} email={user.email} image={user.image} isStaff={isStaff(user)} unread={unread} />
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href="/connexion">Connexion</Link></Button>
                <Button asChild size="sm" className="hidden sm:inline-flex"><Link href="/inscription">Inscription</Link></Button>
              </>
            )}
            <MobileNav signedIn={!!user} />
          </div>
        </div>
      </header>
    </>
  );
}
