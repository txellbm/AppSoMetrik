"use client";

import * as React from 'react';
import { MainSidebar } from '@/components/layout/main-sidebar';
import { AppHeader } from '@/components/layout/header';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePathname } from 'next/navigation';

export function AppShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(isMobile ? false : true);
  const pathname = usePathname();

  React.useEffect(() => {
    if (isMobile) {
      setOpen(false);
    }
  }, [pathname, isMobile]);

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen">
        <Sidebar collapsible="icon">
          <MainSidebar />
        </Sidebar>
        <SidebarInset className="min-w-0 flex-1 flex flex-col bg-background">
          <AppHeader />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
