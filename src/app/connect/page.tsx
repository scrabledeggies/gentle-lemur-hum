"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Copy, Loader2, RefreshCw, ShieldCheck, AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { AdminHeader } from "@/components/admin-header";
import { IosCard } from "@/components/ios-card";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

interface KcStatus {
  connected: boolean;
  connectedAt: string | null;
  lastPingAt: string | null;
}

export default function ConnectPage() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [handshakeCode, setHandshakeCode] = useState<string | null>(null);
  const [isLoadingSetup, setIsLoadingSetup] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const [kcStatus, setKcStatus] = useState<KcStatus | null>(null);
  const [databaseOk, setDatabaseOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading && !session) router.replace("/login");
  }, [isLoading, session, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUrl(window.location.origin);
    }
    if (session) {
      fetchSetupInfo();
      fetchSystemGlance();
    }
  }, [session]);

  const fetchSetupInfo = async () => {
    setIsLoadingSetup(true);
    setSetupError(null);
    const {
      data: { session: current },
    } = await supabase.auth.getSession();

    try {
      const res = await fetch("/api/admin/setup-info", {
        headers: { Authorization: `Bearer ${current?.access_token ?? ""}` },
      });
      const json = await res.json();
      if (res.ok) {
        setHandshakeCode(json.handshake_code);
      } else {
        const msg = json.error ?? "Failed to load setup info";
        setSetupError(msg);
        toast.error(msg);
      }
    } catch {
      const msg = "Failed to load setup info. The server may be misconfigured.";
      setSetupError(msg);
      toast.error(msg);
    }
    setIsLoadingSetup(false);
  };

  const fetchSystemGlance = async () => {
    const {
      data: { session: current },
    } = await supabase.auth.getSession();

    try {
      const res = await fetch("/api/admin/system-status", {
        headers: { Authorization: `Bearer ${current?.access_token ?? ""}` },
      });
      const json = await res.json();
      if (res.ok) {
        setKcStatus(json.kc);
        setDatabaseOk(json.database.ok);
      }
    } catch {
      // Non-critical glance — full details live on /status.
    }
  };

  const generateCode = async () => {
    setIsGenerating(true);
    setSetupError(null);
    const {
      data: { session: current },
    } = await supabase.auth.getSession();

    try {
      const res = await fetch("/api/admin/setup-info", {
        method: "POST",
        headers: { Authorization: `Bearer ${current?.access_token ?? ""}` },
      });
      const json = await res.json();
      if (res.ok) {
        setHandshakeCode(json.handshake_code);
        toast.success("New handshake code generated");
      } else {
        const msg = json.error ?? "Failed to generate code";
        setSetupError(msg);
        toast.error(msg);
      }
    } catch {
      const msg = "Failed to generate code. The server may be misconfigured.";
      setSetupError(msg);
      toast.error(msg);
    }
    setIsGenerating(false);
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isKeyError =
    setupError?.includes("WRONG KEY") ||
    setupError?.includes("Missing SUPABASE_SERVICE_ROLE_KEY") ||
    setupError?.includes("Failed to read pal_setup");

  const isLocalhost = url.includes("localhost") || url.includes("127.0.0.1");

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-foreground shadow-soft">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Connect PAL to KC</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use these values in KC Admin → PAL Connection to link the two consoles.
          </p>
        </div>

        {databaseOk === false && (
          <Alert variant="destructive" className="mb-6 rounded-[24px]">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Server misconfigured</AlertTitle>
            <AlertDescription className="mt-1 flex items-center justify-between gap-3">
              <span className="text-sm">PAL can&apos;t reach its database right now.</span>
              <Link href="/status" className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-2">
                Open System Status <ExternalLink className="h-3 w-3" />
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <IosCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">KittyConsole connection</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {kcStatus?.connected
                    ? kcStatus.lastPingAt
                      ? `Last active ${formatDistanceToNow(new Date(kcStatus.lastPingAt))} ago`
                      : "Handshake complete, waiting for first request"
                    : "KC hasn't connected yet"}
                </p>
              </div>
              <StatusPill
                tone={kcStatus?.connected ? "success" : "neutral"}
                label={kcStatus?.connected ? "Connected" : "Not connected"}
              />
            </div>
            <Link
              href="/status"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              View full system status <ExternalLink className="h-3 w-3" />
            </Link>
          </IosCard>

          <IosCard>
            <label className="mb-2 block text-sm font-medium">PAL Public URL</label>
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-app.vercel.app"
                className="h-11 rounded-2xl font-mono text-sm"
              />
              <Button
                variant="outline"
                className="h-11 rounded-full"
                onClick={() => copy(url)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {isLocalhost && (
              <Alert className="mt-3 rounded-2xl border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Local preview detected</AlertTitle>
                <AlertDescription className="text-sm text-amber-700">
                  KC cannot reach localhost. Paste your live, stable production URL here
                  instead, then copy it and use it in KC.
                </AlertDescription>
              </Alert>
            )}
          </IosCard>

          <IosCard>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium">Handshake code</label>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={generateCode}
                disabled={isGenerating || isKeyError}
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {handshakeCode ? "Regenerate" : "Generate"}
              </Button>
            </div>

            {handshakeCode ? (
              <div className="flex gap-2">
                <Input
                  value={handshakeCode}
                  readOnly
                  className="h-11 rounded-2xl bg-muted font-mono text-sm tracking-wider"
                />
                <Button
                  variant="outline"
                  className="h-11 rounded-full"
                  onClick={() => copy(handshakeCode)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {isLoadingSetup ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                ) : (
                  "Click Generate to create a one-time handshake code."
                )}
              </p>
            )}
          </IosCard>

          <IosCard>
            <h3 className="mb-2 text-sm font-medium">Next steps</h3>
            <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              <li>Copy the live PAL Public URL (not localhost) above.</li>
              <li>Click Generate to create a handshake code, then copy it.</li>
              <li>Open KC Admin → PAL Connection.</li>
              <li>Paste the URL and code, then click Connect.</li>
              <li>Come back here — the connection pill above will flip to &quot;Connected&quot;.</li>
            </ol>
          </IosCard>
        </div>
      </main>
    </div>
  );
}