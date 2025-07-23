
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
import { BrainCircuit, LayoutDashboard, Settings, LifeBuoy, Moon, Dumbbell, HeartPulse, Stethoscope, Droplet, Pill, Flame, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const menuItems = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/sleep", label: "Sueño", icon: Moon },
  { href: "/workouts", label: "Entrenamientos", icon: Dumbbell },
  { href: "/recovery", label: "Recuperación", icon: HeartPulse },
  { href: "/cycle", label: "Ciclo Menstrual", icon: Stethoscope },
  { href: "/hydration", label: "Hidratación", icon: Droplet },
  { href: "/supplements", label: "Suplementos", icon: Pill },
  { href: "/calories", label: "Calorías y Actividad", icon: Flame },
  { href: "/calendar", label: "Calendario Personal", icon: Calendar },
];

const bottomMenuItems = [
    { href: "/settings", label: "Configuración", icon: Settings },
    { href: "/support", label: "Soporte", icon: LifeBuoy },
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
              <Link href={item.href} passHref>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <div>
                    <item.icon />
                    <span>{item.label}</span>
                  </div>
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
                <p className="text-xs text-muted-foreground">Plan Personal</p>
              </div>
            </div>
      </SidebarFooter>
    </>
  );
}
