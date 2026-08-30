"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function IosCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-border bg-card p-6 shadow-soft",
        className,
      )}
    >
      {children}
    </div>
  );
}