import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(50rem_25rem_at_50%_-10%,var(--primary-soft),transparent)]">
      <header className="container-page flex h-16 items-center justify-between pt-[env(safe-area-inset-top)]">
        <Link href="/" aria-label="Tamurt Sending, accueil"><Logo /></Link>
        <ThemeToggle />
      </header>
      <main id="contenu" className="container-page flex flex-1 items-start justify-center py-8 sm:py-14">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
