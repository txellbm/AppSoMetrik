
"use client";

import * as React from 'react';
import { AppHeader } from '@/components/layout/header';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
