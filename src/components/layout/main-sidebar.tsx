"use client";

import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BrainCircuit, LayoutDashboard, Bot, Settings, Upload, Calendar, PenSquare, LifeBuoy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const menuItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "#", label: "Data Upload", icon: Upload },
  { href: "#", label: "Calendar", icon: Calendar },
  { href: "#", label: "Log Entry", icon: PenSquare },
  { href: "#", label: "AI Assistant", icon: Bot },
];

const bottomMenuItems = [
    { href: "#", label: "Settings", icon: Settings },
    { href: "#", label: "Support", icon: LifeBuoy },
]

export function MainSidebar() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
            <BrainCircuit className="w-8 h-8 text-primary" />
            <div className="text-xl font-semibold tracking-tighter group-data-[collapsible=icon]:hidden">
            SoMetrik
            </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex-grow p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
         <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
              <Avatar className="h-9 w-9">
                <AvatarImage src="https://placehold.co/100x100.png" alt="@meri" data-ai-hint="woman smiling"/>
                <AvatarFallback>M</AvatarFallback>
              </Avatar>
              <div className="group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-semibold">Meri</p>
                <p className="text-xs text-muted-foreground">Personal Plan</p>
              </div>
            </div>
      </SidebarFooter>
    </>
  );
}
