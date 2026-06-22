"use client";

import type { ReactNode } from "react";

const btnPrimary =
  "rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium whitespace-nowrap text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40";

const btnSuccess =
  "rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium whitespace-nowrap text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40";

interface WorkflowStepActionProps {
  children?: ReactNode;
}

export function WorkflowStepAction({ children }: WorkflowStepActionProps) {
  if (!children) return null;
  return <div className="shrink-0">{children}</div>;
}

export function PrimaryStepButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={btnPrimary}>
      {children}
    </button>
  );
}

export function SuccessStepButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={btnSuccess}>
      {children}
    </button>
  );
}

export function DownloadStepLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      download="model.glb"
      target="_blank"
      rel="noopener noreferrer"
      className={btnPrimary}
    >
      {children}
    </a>
  );
}

export function HeaderBackButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={btnPrimary}
    >
      {children}
    </button>
  );
}
