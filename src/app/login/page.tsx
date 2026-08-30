"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { IosCard } from "@/components/ios-card";

export default function LoginPage() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && session) {
      router.replace("/connect");
    }
  }, [isLoading, session, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (session) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-foreground shadow-soft">
            <span className="text-xl font-bold">P</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">PAL Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage your PAL connection.
          </p>
        </div>

        <IosCard>
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "#D88B9E",
                    brandAccent: "#C97C90",
                  },
                  borderWidths: {
                    buttonBorderWidth: "1px",
                    inputBorderWidth: "1px",
                  },
                  radii: {
                    borderRadiusButton: "20px",
                    buttonBorderRadius: "20px",
                    inputBorderRadius: "16px",
                  },
                },
              },
            }}
            theme="light"
          />
        </IosCard>
      </div>
    </div>
  );
}