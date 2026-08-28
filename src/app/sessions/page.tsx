"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Activity, ArrowLeft, Eye, Loader2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { AdminHeader } from "@/components/admin-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PortalSession } from "@/types/portal";

const statusStyles: Record<string, { badge: string; dot: string; label: string }> = {
  waiting: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    dot: "bg-amber-500",
    label: "Waiting",
  },
  active: {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
    label: "Active",
  },
  ended: {
    badge: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    dot: "bg-slate-400",
    label: "Ended",
  },
};

function displayStatus(s: PortalSession): string {
  if (s.status !== "ended" && s.expires_at && new Date(s.expires_at).getTime() <= Date.now()) {
    return "ended";
  }
  return s.status;
}

export default function SessionsPage() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  const [sessions, setSessions] = useState<PortalSession[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [capturesFor, setCapturesFor] = useState<PortalSession | null>(null);

  useEffect(() => {
    if (!isLoading && !session) router.replace("/login");
  }, [isLoading, session, router]);

  const fetchSessions = useCallback(async () => {
    setIsFetching(true);
    const { data, error } = await supabase
      .from("sessions")
      .select("*, subdomains(prefix, domains(domain_name))")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      toast.error("Failed to load sessions");
    } else {
      setSessions((data as unknown as PortalSession[]) ?? []);
    }
    setIsFetching(false);
  }, []);

  useEffect(() => {
    if (session) fetchSessions();
  }, [session, fetchSessions]);

  const onClose = async (s: PortalSession) => {
    setClosingId(s.id);
    const { error } = await supabase
      .from("sessions")
      .update({ status: "ended", closed_at: new Date().toISOString() })
      .eq("id", s.id);
    setClosingId(null);

    if (error) {
      toast.error("Failed to close session");
      return;
    }
    toast.success("Session closed");
    fetchSessions();
  };

  const hostOf = (s: PortalSession) =>
    s.subdomains?.domains?.domain_name
      ? `${s.subdomains.prefix}.${s.subdomains.domains.domain_name}`
      : (s.subdomains?.prefix ?? "—");

  const formatDate = (v: string | null | undefined) =>
    v ? format(new Date(v), "MMM d, HH:mm") : "—";

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <h2 className="text-xl font-semibold">Portal Sessions</h2>
            <p className="text-sm text-muted-foreground">
              Live and past sessions created through the KC portals API.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchSessions}
            disabled={isFetching}
            className="rounded-xl"
          >
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-background shadow-sm animate-in fade-in duration-500">
          {isFetching && sessions.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <Activity className="h-7 w-7" />
              </div>
              <h3 className="font-semibold">No sessions yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Sessions appear here when KC creates them through the portals API.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Portal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Client IP</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Captures</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  const st = displayStatus(s);
                  const style = statusStyles[st] ?? statusStyles.ended;
                  const captureCount = Object.keys(s.captures ?? {}).length;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{hostOf(s)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                            style.badge,
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
                          {style.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.client_ip ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.current_page ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{captureCount}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(s.created_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(s.expires_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => setCapturesFor(s)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {st !== "ended" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              disabled={closingId === s.id}
                              onClick={() => onClose(s)}
                            >
                              {closingId === s.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </main>

      <Dialog open={!!capturesFor} onOpenChange={() => setCapturesFor(null)}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Session detail</DialogTitle>
            <DialogDescription>
              {capturesFor ? hostOf(capturesFor) : ""} · captured field values
            </DialogDescription>
          </DialogHeader>
          {capturesFor && Object.keys(capturesFor.captures ?? {}).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nothing captured yet.
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(capturesFor?.captures ?? {}).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border px-3 py-2"
                >
                  <span className="text-sm font-medium">{key}</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}