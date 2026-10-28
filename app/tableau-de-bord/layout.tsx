import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SidebarNav, MobileTabBar } from "@/components/dashboard/nav";
import { requireUserPage } from "@/server/auth/session";
import { unreadCount } from "@/server/services/notifications";
import { unreadConversations } from "@/server/services/messaging";
import { RealtimeRefresher } from "@/components/dashboard/realtime";

export const metadata: Metadata = { title: { default: "Tableau de bord", template: "%s · Tableau de bord" }, robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage("/tableau-de-bord");
  const [notifications, messages] = await Promise.all([unreadCount(user.id), unreadConversations(user.id)]);
  const counts = { notifications, messages };
  return (
    <>
      <SiteHeader />
      <div className="container-page grid gap-8 pb-28 pt-6 lg:grid-cols-[15rem_1fr] lg:pb-16 lg:pt-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24"><SidebarNav counts={counts} /></div>
        </aside>
        <main id="contenu" className="min-w-0">{children}</main>
      </div>
      <MobileTabBar counts={counts} />
      <RealtimeRefresher />
    </>
  );
}
