"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, RefreshCw, ShieldCheck, AlertTriangle, ExternalLink, Stethoscope } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { AdminHeader } from "@/components/admin-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DiagnosticsResult {
  exists: boolean;
  message?: string;
  length?: number;
  prefixPreview?: string;
  hasWhitespaceOrQuotes?: boolean;
  looksLegacyJwt?: boolean;
  looksNewSecret?: boolean;
  looksPublishable?: boolean;
  vercelEnv?: string;
}

export default function ConnectPage() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [handshakeCode, setHandshakeCode] = useState<string | null>(null);
  const [isLoadingSetup, setIsLoadingSetup] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const [diagnostics, setDiagnostics] = useState<DiagnosticsResult | null>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  useEffect(() => {
    if (!isLoading && !session) router.replace("/login");
  }, [isLoading, session, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUrl(window.location.origin);
    }
    if (session) fetchSetupInfo();
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

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    const {
      data: { session: current },
    } = await supabase.auth.getSession();

    try {
      const res = await fetch("/api/admin/diagnostics", {
        headers: { Authorization: `Bearer ${current?.access_token ?? ""}` },
      });
      const json = await res.json();
      if (res.ok) {
        setDiagnostics(json);
      } else {
        toast.error(json.error ?? "Failed to run diagnostics");
      }
    } catch {
      toast.error("Failed to run diagnostics");
    }
    setIsRunningDiagnostics(false);
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

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ffccf1] text-foreground shadow-lg">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Connect PAL to KC</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use these values in KC Admin → PAL Connection to link the two consoles.
          </p>
        </div>

        {isKeyError && (
          <Alert
            variant="destructive"
            className="mb-6 rounded-2xl border-red-200 bg-red-50"
          >
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-red-800">Server misconfiguration detected</AlertTitle>
            <AlertDescription className="mt-2 text-sm text-red-700">
              <p className="mb-2">{setupError}</p>
              <ol className="ml-4 list-decimal space-y-1 text-sm">
                <li>Go to <strong>Supabase → Project Settings → API</strong>.</li>
                <li>Under <strong>Project API keys</strong>, copy the <strong>service_role</strong> (secret) key.</li>
                <li>
                  Go to{" "}
                  <strong>Vercel → Project Settings → Environment Variables</strong>.
                </li>
                <li>
                  Make sure a variable named <code className="rounded bg-red-100 px-1 py-0.5 font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
                  exists, is enabled for <strong>Production</strong>, and has the <strong>service_role</strong> key as its value.
                </li>
                <li>Redeploy your project for the change to take effect.</li>
              </ol>
              <div className="mt-3 flex gap-2">
                <a
                  href="https://supabase.com/dashboard/project/_/settings/api"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-red-800 underline underline-offset-2 hover:text-red-900"
                >
                  Open Supabase API settings <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {isKeyError && (
            <div className="rounded-3xl border border-border bg-background p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium">Diagnose the key problem</label>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={runDiagnostics}
                  disabled={isRunningDiagnostics}
                >
                  {isRunningDiagnostics ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Stethoscope className="mr-2 h-4 w-4" />
                  )}
                  Run diagnostics
                </Button>
              </div>

              {diagnostics && (
                <div className="space-y-2 rounded-xl bg-muted p-4 font-mono text-xs">
                  {!diagnostics.exists ? (
                    <p className="text-red-600">
                      No SUPABASE_SERVICE_ROLE_KEY found on this deployment at all. It was
                      never saved, or was added to the wrong environment (e.g. Preview
                      instead of Production).
                    </p>
                  ) : (
                    <>
                      <p>Deployment environment: <strong>{diagnostics.vercelEnv}</strong></p>
                      <p>Key length: <strong>{diagnostics.length}</strong> characters</p>
                      <p>Starts with: <strong>{diagnostics.prefixPreview}</strong></p>
                      <p>
                        Has extra spaces/quotes:{" "}
                        <strong>{diagnostics.hasWhitespaceOrQuotes ? "YES — this is likely the bug" : "No"}</strong>
                      </p>
                      <p>Looks like legacy service key (eyJ...): <strong>{diagnostics.looksLegacyJwt ? "Yes" : "No"}</strong></p>
                      <p>Looks like new secret key (sb_secret_...): <strong>{diagnostics.looksNewSecret ? "Yes" : "No"}</strong></p>
                      <p>
                        Looks like a Publishable key (wrong key pasted):{" "}
                        <strong className={diagnostics.looksPublishable ? "text-red-600" : ""}>
                          {diagnostics.looksPublishable ? "YES — this is the bug" : "No"}
                        </strong>
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="rounded-3xl border border-border bg-background p-6 shadow-sm">
            <label className="mb-2 block text-sm font-medium">PAL Public URL</label>
            <div className="flex gap-2">
              <Input
                value={url}
                readOnly
                className="h-11 rounded-xl bg-muted font-mono text-sm"
              />
              <Button
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => copy(url)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-background p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium">Handshake code</label>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
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
                  className="h-11 rounded-xl bg-muted font-mono text-sm tracking-wider"
                />
                <Button
                  variant="outline"
                  className="h-11 rounded-xl"
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
          </div>

          <div className="rounded-3xl border border-border bg-background p-6 shadow-sm">
            <h3 className="mb-2 text-sm font-medium">Next steps</h3>
            <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              <li>Copy the PAL Public URL above.</li>
              <li>Click Generate to create a handshake code, then copy it.</li>
              <li>Open KC Admin → PAL Connection.</li>
              <li>Paste the URL and code, then click Connect.</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}