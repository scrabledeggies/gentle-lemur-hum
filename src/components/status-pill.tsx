"use client";

import { cn } from "@/lib/utils";

type StatusTone = "success" | "warning" | "error" | "neutral";

const toneStyles: Record<StatusTone, string> = {
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
  neutral: "bg-muted text-muted-foreground",
};

const dotStyles: Record<StatusTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  neutral: "bg-muted-foreground",
};

export function StatusPill({
  tone,
  label,
}: {
  tone: StatusTone;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap",
        toneStyles[tone],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotStyles[tone])} />
      {label}
    </span>
  );
}