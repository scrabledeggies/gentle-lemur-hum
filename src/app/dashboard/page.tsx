"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Mail, UserRound } from "lucide-react";

import { useSession } from "@/components/providers/session-provider";
import { AdminHeader } from "@/components/admin-header";

export default function DashboardPage() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, session, router]);

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
        <h2 className="mb-6 text-xl font-semibold">Dashboard</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/relays"
            className="group flex flex-col justify-between rounded-3xl border border-border bg-background p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold">SMTP Relays</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage relay servers, monitor status and daily send volume.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
              Manage relays
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/senders"
            className="group flex flex-col justify-between rounded-3xl border border-border bg-background p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <UserRound className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold">Sender Identities</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage "from" names available for outgoing emails.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
              Manage senders
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}