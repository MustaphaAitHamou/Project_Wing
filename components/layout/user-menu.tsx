"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LayoutDashboard, LogOut, MessageSquare, Package, Settings, Shield, Truck } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { authClient } from "@/lib/auth-client";

export function UserMenu({ name, email, image, isStaff, unread }: { name: string; email: string; image: string | null; isStaff: boolean; unread: number }) {
  const router = useRouter();
  return (
    <Dropdown>
      <DropdownTrigger className="relative flex items-center gap-2 rounded-full p-0.5 outline-offset-2 hover:ring-2 hover:ring-border" aria-label={`Menu du compte${unread ? `, ${unread} notification(s) non lue(s)` : ""}`}>
        <Avatar name={name} src={image} size={36} />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
      </DropdownTrigger>
      <DropdownContent>
        <DropdownLabel>
          <span className="block font-semibold text-foreground">{name}</span>
          <span className="block truncate">{email}</span>
        </DropdownLabel>
        <DropdownSeparator />
        <DropdownItem asChild><Link href="/tableau-de-bord"><LayoutDashboard />Tableau de bord</Link></DropdownItem>
        <DropdownItem asChild><Link href="/tableau-de-bord/colis"><Package />Mes colis</Link></DropdownItem>
        <DropdownItem asChild><Link href="/tableau-de-bord/trajets"><Truck />Mes trajets</Link></DropdownItem>
        <DropdownItem asChild><Link href="/tableau-de-bord/messages"><MessageSquare />Messages</Link></DropdownItem>
        <DropdownItem asChild><Link href="/tableau-de-bord/notifications"><Bell />Notifications{unread > 0 && <span className="ml-auto rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white">{unread}</span>}</Link></DropdownItem>
        <DropdownItem asChild><Link href="/tableau-de-bord/parametres"><Settings />Paramètres</Link></DropdownItem>
        {isStaff && <DropdownItem asChild><Link href="/admin"><Shield />Administration</Link></DropdownItem>}
        <DropdownSeparator />
        <DropdownItem
          onSelect={async () => {
            await authClient.signOut();
            router.push("/");
            router.refresh();
          }}
        >
          <LogOut />Se déconnecter
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
