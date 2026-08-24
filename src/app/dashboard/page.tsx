"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, session, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.replace("/login");
  };

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const username = session.user.email?.split("@")[0] ?? "admin";

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">PAL</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {username}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-background py-24 text-center animate-in fade-in duration-700">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <LayoutDashboard className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            This is your empty workspace. Features will show up here once
            they&apos;re built.
          </p>
        </div>
      </main>
    </div>
  );
}