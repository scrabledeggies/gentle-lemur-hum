"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Pencil, Plus, Power, PowerOff, UserRound } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { AdminHeader } from "@/components/admin-header";
import { SenderFormDialog } from "@/components/senders/sender-form-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SenderIdentity } from "@/types/sender";

export default function SendersPage() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  const [senders, setSenders] = useState<SenderIdentity[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSender, setEditingSender] = useState<SenderIdentity | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, session, router]);

  const fetchSenders = useCallback(async () => {
    setIsFetching(true);
    const { data, error } = await supabase
      .from("sender_identities")
      .select("*")
      .order("display_name", { ascending: true });

    if (error) {
      toast.error("Failed to load senders");
    } else {
      setSenders((data as SenderIdentity[]) ?? []);
    }
    setIsFetching(false);
  }, []);

  useEffect(() => {
    if (session) {
      fetchSenders();
    }
  }, [session, fetchSenders]);

  const handleAdd = () => {
    setEditingSender(null);
    setDialogOpen(true);
  };

  const handleEdit = (sender: SenderIdentity) => {
    setEditingSender(sender);
    setDialogOpen(true);
  };

  const handleToggleActive = async (sender: SenderIdentity) => {
    setTogglingId(sender.id);
    const { error } = await supabase
      .from("sender_identities")
      .update({ is_active: !sender.is_active })
      .eq("id", sender.id);
    setTogglingId(null);

    if (error) {
      toast.error("Failed to update sender status");
      return;
    }

    toast.success(sender.is_active ? "Sender deactivated" : "Sender activated");
    fetchSenders();
  };

  const formatDate = (value: string) => format(new Date(value), "MMM d, HH:mm");

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
            <h2 className="text-xl font-semibold">Sender Identities</h2>
            <p className="text-sm text-muted-foreground">
              Manage the "from" names KittyConsole can pick from.
            </p>
          </div>
          <Button onClick={handleAdd} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Add sender
          </Button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-background shadow-sm animate-in fade-in duration-500">
          {isFetching ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : senders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <UserRound className="h-7 w-7" />
              </div>
              <h3 className="font-semibold">No senders yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add your first sender identity so it can be selected as a "from" name.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Display name</TableHead>
                  <TableHead>From email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {senders.map((sender) => (
                  <TableRow key={sender.id}>
                    <TableCell className="font-medium">{sender.display_name}</TableCell>
                    <TableCell className="text-muted-foreground">{sender.from_email}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                          sender.is_active
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            sender.is_active ? "bg-emerald-500" : "bg-slate-400",
                          )}
                        />
                        {sender.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(sender.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => handleEdit(sender)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          disabled={togglingId === sender.id}
                          onClick={() => handleToggleActive(sender)}
                        >
                          {togglingId === sender.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : sender.is_active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
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

      <SenderFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sender={editingSender}
        onSaved={fetchSenders}
      />
    </div>
  );
}