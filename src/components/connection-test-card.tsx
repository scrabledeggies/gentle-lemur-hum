"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";

import { IosCard } from "@/components/ios-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StepStatus = "idle" | "running" | "success" | "error";

interface Step {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

const INITIAL_STEPS: Step[] = [
  { id: "config", label: "Fetch /api/config", status: "idle" },
  { id: "generate", label: "Generate a test-only handshake code", status: "idle" },
  { id: "exchange", label: "Exchange code for an API key", status: "idle" },
  { id: "health", label: "Call /health with the key", status: "idle" },
  { id: "portals", label: "Call /api/portals/categories with the key", status: "idle" },
];

export function ConnectionTestCard() {
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [isRunning, setIsRunning] = useState(false);

  const updateStep = (id: string, status: StepStatus, detail?: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, detail } : s)),
    );
  };

  const runTest = async () => {
    setIsRunning(true);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "idle", detail: undefined })));

    // Step 1: config
    updateStep("config", "running");
    try {
      const res = await fetch("/api/config");
      const json = await res.json();
      if (!res.ok || !json.endpoints) throw new Error("Missing endpoints in response");
      updateStep("config", "success", `service: ${json.service ?? "unknown"}`);
    } catch (err) {
      updateStep("config", "error", err instanceof Error ? err.message : "Failed");
      setIsRunning(false);
      toast.error("Connection test failed at /api/config");
      return;
    }

    // Step 2: generate a TEST-ONLY handshake code — this is isolated from
    // the real code shown to KC, so running this test never invalidates
    // whatever code KC is mid-way through redeeming.
    updateStep("generate", "running");
    let code: string;
    try {
      const res = await fetch("/api/admin/self-test-handshake", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.handshake_code) throw new Error(json.error ?? "No code returned");
      code = json.handshake_code;
      updateStep("generate", "success", `code: ${code.slice(0, 6)}…`);
    } catch (err) {
      updateStep("generate", "error", err instanceof Error ? err.message : "Failed");
      setIsRunning(false);
      toast.error("Connection test failed generating a test handshake code");
      return;
    }

    // Step 3: exchange code for key (same endpoint KC uses)
    updateStep("exchange", "running");
    let apiKey: string;
    try {
      const res = await fetch("/api/handshake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok || !json.api_key) throw new Error(json.error ?? "No api_key returned");
      apiKey = json.api_key;
      updateStep("exchange", "success", `key: ${apiKey.slice(0, 6)}…`);
    } catch (err) {
      updateStep("exchange", "error", err instanceof Error ? err.message : "Failed");
      setIsRunning(false);
      toast.error("Connection test failed exchanging the handshake code");
      return;
    }

    // Step 4: health check with the key
    updateStep("health", "running");
    try {
      const res = await fetch("/health", { headers: { "x-pal-key": apiKey } });
      const json = await res.json();
      if (!res.ok || json.ok !== true) throw new Error("Health check did not return ok:true");
      updateStep("health", "success", "ok: true");
    } catch (err) {
      updateStep("health", "error", err instanceof Error ? err.message : "Failed");
      setIsRunning(false);
      toast.error("Connection test failed at /health");
      return;
    }

    // Step 5: portals categories with the key
    updateStep("portals", "running");
    try {
      const res = await fetch("/api/portals/categories", { headers: { "x-pal-key": apiKey } });
      const json = await res.json();
      if (!res.ok || !Array.isArray(json)) throw new Error("Did not receive an array");
      updateStep(
        "portals",
        "success",
        json.length === 0 ? "0 categories (none seeded yet)" : `${json.length} categories`,
      );
    } catch (err) {
      updateStep("portals", "error", err instanceof Error ? err.message : "Failed");
      setIsRunning(false);
      toast.error("Connection test failed at /api/portals/categories");
      return;
    }

    setIsRunning(false);
    toast.success("Connection test passed — PAL's API contract is working");
  };

  return (
    <IosCard>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Connection test</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Runs PAL through the exact steps KC performs, using an isolated
            test code that never affects KC&apos;s real connection.
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-full"
          onClick={runTest}
          disabled={isRunning}
        >
          {isRunning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="mr-2 h-4 w-4" />
          )}
          Run test
        </Button>
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              {step.status === "success" && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              )}
              {step.status === "error" && (
                <XCircle className="h-4 w-4 shrink-0 text-red-600" />
              )}
              {step.status === "running" && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              )}
              {step.status === "idle" && (
                <span className="h-4 w-4 shrink-0 rounded-full border border-muted-foreground/30" />
              )}
              <span
                className={cn(
                  "truncate text-sm",
                  step.status === "idle" && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {step.detail && (
              <span className="shrink-0 text-xs text-muted-foreground font-mono">
                {step.detail}
              </span>
            )}
          </div>
        ))}
      </div>
    </IosCard>
  );
}