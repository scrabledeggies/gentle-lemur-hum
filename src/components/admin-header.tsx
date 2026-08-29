"use client";

import { useRouter } from "next/navigation";
import { LogOut, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/providers/session-provider";
import { supabase } from "@/integrations/supabase/client";

export function AdminHeader() {
  const { user } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffccf1] text-foreground">
            <Link2 className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">PAL Admin</span>
        </div>

        <div className="flex items-center gap-4">
          {user?.email && (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
          )}
          <Button
            variant="ghost"
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
  );
}
