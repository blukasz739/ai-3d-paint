"use client";

import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
  headerAction?: ReactNode;
  headerLeading?: ReactNode;
}

export function AppShell({ children, headerAction, headerLeading }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <header className="shrink-0 border-b border-zinc-800 px-4 py-4 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            {headerLeading ?? (
              <>
                <h1 className="text-xl font-semibold tracking-tight">AI 3D Paint</h1>
                <p className="text-sm text-zinc-500">
                  Rysuj → stylizuj → generuj model 3D
                </p>
              </>
            )}
          </div>
          {headerAction}
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
