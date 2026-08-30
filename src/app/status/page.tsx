"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Loader2,
  RefreshCw,
  Database,
  KeyRound,
  Radio,
  Mail,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { AdminHeader } from "@/components/admin-header";
import { IosCard } from "@/components/ios-card";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface RelayStatus {
  id: string;
  name: string;
  host: string;
  status: string;
  daily_limit: number;
  sent_today: number;
  last_used_at: string | null;
}

interface EmailLogEntry {
  id: string;
  to: string;
  subject: string;
  status: string;
  sent_at: string;
}

interface SystemStatusResponse {
  database: { ok: boolean; message: string };
  serviceKey: {
    exists: boolean;
    looksValid?: boolean;
    looksPublishable?: boolean;
    hasWhitespaceOrQuotes?: boolean;
  };
  kc: { connected: boolean; connectedAt: string | null; lastPingAt: string | null };
  relays: RelayStatus[];
  recentEmails: EmailLogEntry[];
}

export default function StatusPage() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  const [data, setData] = useState<SystemStatusResponse | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!isLoading && !session) router.replace("/login");
  }, [isLoading, session, router]);

  const fetchStatus = useCallback(async (showToast = false) => {
    setIsFetching(true);
    const {
      data: { session: current },
    } = await supabase.auth.getSession();

    try {
      const res = await fetch("/api/admin/system-status", {
        headers: { Authorization: `Bearer ${current?.access_token ?? ""}` },
      });
      const json = await res.json();
      if (res.ok) {
        setData(json);
        if (showToast) toast.success("Status refreshed");
      } else {
        toast.error(json.error ?? "Failed to load system status");
      }
    } catch {
      toast.error("Failed to reach the status endpoint");
    }
    setIsFetching(false);
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchStatus();
    const interval = setInterval(() => fetchStatus(), 30000);
    return () => clearInterval(interval);
  }, [session, fetchStatus]);

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const issues: string[] = [];
  if (data && !data.database.ok) issues.push("Database connection failed");
  if (data && data.serviceKey.exists && !data.serviceKey.looksValid) {
    issues.push("Service role key looks invalid");
  }
  if (data && !data.serviceKey.exists) issues.push("Service role key is missing");

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Status</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Live health checks for PAL&apos;s core systems.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => fetchStatus(true)}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {!data ? (
          <IosCard className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </IosCard>
        ) : (
          <div className="space-y-6">
            <IosCard>
              <div className="flex items-center gap-3">
                <StatusPill
                  tone={issues.length === 0 ? "success" : "error"}
                  label={issues.length === 0 ? "All systems operational" : `${issues.length} issue${issues.length > 1 ? "s" : ""} found`}
                />
              </div>
              {issues.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {issues.map((issue) => (
                    <li key={issue} className="flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                      {issue}
                    </li>
                  ))}
                </ul>
              )}
            </IosCard>

            <IosCard>
              <div className="mb-4 flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Database</h2>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Connection</span>
                <StatusPill tone={data.database.ok ? "success" : "error"} label={data.database.ok ? "Connected" : "Failed"} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground break-all">{data.database.message}</p>

              <div className="my-4 h-px bg-border" />

              <div className="mb-2 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Service role key</h2>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Format</span>
                <StatusPill
                  tone={data.serviceKey.exists && data.serviceKey.looksValid && !data.serviceKey.looksPublishable ? "success" : "error"}
                  label={
                    !data.serviceKey.exists
                      ? "Missing"
                      : data.serviceKey.looksPublishable
                        ? "Wrong key type"
                        : data.serviceKey.looksValid
                          ? "Valid"
                          : "Unrecognized"
                  }
                />
              </div>
            </IosCard>

            <IosCard>
              <div className="mb-4 flex items-center gap-2">
                <Radio className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">KittyConsole connection</h2>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Handshake completed</span>
                <StatusPill tone={data.kc.connected ? "success" : "neutral"} label={data.kc.connected ? "Connected" : "Not connected yet"} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {data.kc.connectedAt
                  ? `Connected ${formatDistanceToNow(new Date(data.kc.connectedAt))} ago`
                  : "KC has not exchanged a handshake code yet."}
              </p>

              <div className="my-4 h-px bg-border" />

              <div className="flex items-center justify-between">
                <span className="text-sm">Last authenticated request</span>
                <StatusPill
                  tone={data.kc.lastPingAt ? "success" : "neutral"}
                  label={data.kc.lastPingAt ? "Active" : "No activity yet"}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {data.kc.lastPingAt
                  ? `Last seen ${formatDistanceToNow(new Date(data.kc.lastPingAt))} ago`
                  : "PAL hasn't received an authenticated request from KC yet."}
              </p>
            </IosCard>

            <IosCard>
              <div className="mb-4 flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">SMTP relays</h2>
              </div>
              {data.relays.length === 0 ? (
                <p className="text-sm text-muted-foreground">No SMTP relays configured yet.</p>
              ) : (
                <div className="space-y-4">
                  {data.relays.map((relay) => {
                    const pct = relay.daily_limit > 0 ? Math.min(100, Math.round((relay.sent_today / relay.daily_limit) * 100)) : 0;
                    return (
                      <div key={relay.id}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{relay.name}</p>
                            <p className="text-xs text-muted-foreground">{relay.host}</p>
                          </div>
                          <StatusPill
                            tone={relay.status === "healthy" ? "success" : relay.status === "paused" ? "warning" : "error"}
                            label={relay.status}
                          />
                        </div>
                        <Progress value={pct} className="mt-2 h-1.5" />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {relay.sent_today} / {relay.daily_limit} sent today
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </IosCard>

            <IosCard>
              <h2 className="mb-4 text-sm font-semibold">Recent email activity</h2>
              {data.recentEmails.length === 0 ? (
                <p className="text-sm text-muted-foreground">No emails sent yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.recentEmails.map((email) => (
                    <div key={email.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{email.subject}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          To {email.to} · {formatDistanceToNow(new Date(email.sent_at))} ago
                        </p>
                      </div>
                      <StatusPill tone={email.status === "sent" ? "success" : "error"} label={email.status} />
                    </div>
                  ))}
                </div>
              )}
            </IosCard>
          </div>
        )}
      </main>
    </div>
  );
}