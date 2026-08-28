"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { AdminHeader } from "@/components/admin-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ConnectPage() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [handshakeCode, setHandshakeCode] = useState<string | null>(null);
  const [isLoadingSetup, setIsLoadingSetup] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

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
        toast.error(json.error ?? "Failed to load setup info");
      }
    } catch {
      toast.error("Failed to load setup info");
    }
    setIsLoadingSetup(false);
  };

  const generateCode = async () => {
    setIsGenerating(true);
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
        toast.error(json.error ?? "Failed to generate code");
      }
    } catch {
      toast.error("Failed to generate code");
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

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Connect PAL to KC</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use these values in KC Admin → PAL Connection to link the two consoles.
          </p>
        </div>

        <div className="space-y-6">
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
                disabled={isGenerating}
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