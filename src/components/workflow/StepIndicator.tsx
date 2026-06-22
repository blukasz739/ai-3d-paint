"use client";

import { WORKFLOW_STEPS } from "@/lib/types/workflow";
import type { WorkflowStep } from "@/lib/types/workflow";

interface StepIndicatorProps {
  currentStep: WorkflowStep;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentIndex = WORKFLOW_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <nav className="flex shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-950 px-4 py-3 lg:px-8">
      {WORKFLOW_STEPS.map((step, index) => {
        const isActive = step.id === currentStep;
        const isDone = index < currentIndex;

        return (
          <div key={step.id} className="flex items-center gap-2">
            {index > 0 && (
              <span
                className={`hidden h-px w-6 sm:block ${
                  isDone ? "bg-violet-500" : "bg-zinc-700"
                }`}
              />
            )}
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${
                isActive
                  ? "bg-violet-500/15 text-violet-300"
                  : isDone
                    ? "text-zinc-400"
                    : "text-zinc-600"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isActive
                    ? "bg-violet-600 text-white"
                    : isDone
                      ? "bg-zinc-700 text-zinc-300"
                      : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {index + 1}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
