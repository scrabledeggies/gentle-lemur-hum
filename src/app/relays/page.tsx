"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Pencil, Plus, Power, PowerOff, Server } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { AdminHeader } from "@/components/admin-header";
import { RelayStatusBadge } from "@/components/relays/relay-status-badge";
import { RelayFormDialog } from "@/components/relays/relay-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Relay } from "@/types/relay";

export default function RelaysPage() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  const [relays, setRelays] = useState<Relay[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRelay, setEditingRelay] = useState<Relay | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, session, router]);

  const fetchRelays = useCallback(async () => {
    setIsFetching(true);
    const { data, error } = await supabase
      .from("smtp_relays_safe")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      toast.error("Failed to load relays");
    } else {
      setRelays((data as Relay[]) ?? []);
    }
    setIsFetching(false);
  }, []);

  useEffect(() => {
    if (session) {
      fetchRelays();
    }
  }, [session, fetchRelays]);

  const handleAdd = () => {
    setEditingRelay(null);
    setDialogOpen(true);
  };

  const handleEdit = (relay: Relay) => {
    setEditingRelay(relay);
    setDialogOpen(true);
  };

  const handleToggleStatus = async (relay: Relay) => {
    const nextStatus = relay.status === "disabled" ? "healthy" : "disabled";
    setTogglingId(relay.id);
    const { error } = await supabase
      .from("smtp_relays")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", relay.id);
    setTogglingId(null);

    if (error) {
      toast.error("Failed to update relay status");
      return;
    }

    toast.success(nextStatus === "disabled" ? "Relay disabled" : "Relay enabled");
    fetchRelays();
  };

  const formatDate = (value: string | null) =>
    value ? format(new Date(value), "MMM d, HH:mm") : "—";

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
            <h2 className="text-xl font-semibold">SMTP Relays</h2>
            <p className="text-sm text-muted-foreground">
              Manage relay servers and monitor delivery health.
            </p>
          </div>
          <Button onClick={handleAdd} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Add relay
          </Button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-background shadow-sm animate-in fade-in duration-500">
          {isFetching ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : relays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <Server className="h-7 w-7" />
              </div>
              <h3 className="font-semibold">No relays yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add your first SMTP relay server to start monitoring status and volume.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent today</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relays.map((relay) => (
                  <TableRow key={relay.id}>
                    <TableCell className="font-medium">{relay.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {relay.host}:{relay.port}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{relay.username}</TableCell>
                    <TableCell>
                      <RelayStatusBadge status={relay.status} />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{relay.sent_today}</span>
                      <span className="text-muted-foreground"> / {relay.daily_limit}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(relay.last_used_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => handleEdit(relay)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          disabled={togglingId === relay.id}
                          onClick={() => handleToggleStatus(relay)}
                        >
                          {togglingId === relay.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : relay.status === "disabled" ? (
                            <Power className="h-4 w-4" />
                          ) : (
                            <PowerOff className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>

      <RelayFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        relay={editingRelay}
        onSaved={fetchRelays}
      />
    </div>
  );
}