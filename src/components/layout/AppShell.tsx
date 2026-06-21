"use client";

import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-4 py-4 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">AI 3D Paint</h1>
            <p className="text-sm text-zinc-500">
              Rysuj → stylizuj → generuj model 3D
            </p>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
