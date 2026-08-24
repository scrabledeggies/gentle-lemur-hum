import { cn } from "@/lib/utils";
import type { RelayStatus } from "@/types/relay";

const statusConfig: Record<RelayStatus, { label: string; badge: string; dot: string }> = {
  healthy: {
    label: "Healthy",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  down: {
    label: "Down",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    dot: "bg-red-500",
  },
  disabled: {
    label: "Disabled",
    badge: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};

export function RelayStatusBadge({ status }: { status: RelayStatus }) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        config.badge,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}