"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Plus, ShieldBan, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { AdminHeader } from "@/components/admin-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { IpBan } from "@/types/portal";

const banSchema = z.object({
  ip: z.string().min(3, "Enter an IP address"),
  hours: z.string().optional(),
});

type BanFormValues = z.infer<typeof banSchema>;

function isActive(ban: IpBan): boolean {
  return !ban.expires_at || new Date(ban.expires_at).getTime() > Date.now();
}

export default function BansPage() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  const [bans, setBans] = useState<IpBan[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const form = useForm<BanFormValues>({
    resolver: zodResolver(banSchema),
    defaultValues: { ip: "", hours: "" },
  });

  useEffect(() => {
    if (!isLoading && !session) router.replace("/login");
  }, [isLoading, session, router]);

  const fetchBans = useCallback(async () => {
    setIsFetching(true);
    const { data, error } = await supabase
      .from("bans")
      .select("*")
      .order("banned_at", { ascending: false });
    if (error) {
      toast.error("Failed to load bans");
    } else {
      setBans((data as IpBan[]) ?? []);
    }
    setIsFetching(false);
  }, []);

  useEffect(() => {
    if (session) fetchBans();
  }, [session, fetchBans]);

  const onSubmit = async (values: BanFormValues) => {
    const hours = values.hours?.trim() ? parseInt(values.hours.trim(), 10) : null;
    if (values.hours?.trim() && (Number.isNaN(hours) || (hours ?? 0) <= 0)) {
      form.setError("hours", { message: "Enter a positive number of hours" });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("bans").insert({
      ip: values.ip.trim(),
      expires_at: hours ? new Date(Date.now() + hours * 3600 * 1000).toISOString() : null,
    });
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(hours ? `Banned for ${hours}h` : "Banned permanently");
    setDialogOpen(false);
    form.reset({ ip: "", hours: "" });
    fetchBans();
  };

  const onRemove = async (ban: IpBan) => {
    setRemovingId(ban.id);
    const { error } = await supabase.from("bans").delete().eq("id", ban.id);
    setRemovingId(null);

    if (error) {
      toast.error("Failed to remove ban");
      return;
    }
    toast.success("Ban removed");
    fetchBans();
  };

  const formatDate = (v: string | null) => (v ? format(new Date(v), "MMM d, HH:mm") : "Never");

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
            <h2 className="text-xl font-semibold">IP Bans</h2>
            <p className="text-sm text-muted-foreground">
              Banned visitors see a faux 404 on every portal.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Ban IP
          </Button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-background shadow-sm animate-in fade-in duration-500">
          {isFetching ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : bans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <ShieldBan className="h-7 w-7" />
              </div>
              <h3 className="font-semibold">No bans</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Ban an IP address to block it from all portals with a faux 404.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Banned at</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bans.map((ban) => {
                  const active = isActive(ban);
                  return (
                    <TableRow key={ban.id}>
                      <TableCell className="font-medium">{ban.ip}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                            active
                              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                              : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              active ? "bg-red-500" : "bg-slate-400",
                            )}
                          />
                          {active ? "Banned" : "Expired"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(ban.banned_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(ban.expires_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          disabled={removingId === ban.id}
                          onClick={() => onRemove(ban)}
                        >
                          {removingId === ban.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ban IP address</DialogTitle>
            <DialogDescription>
              The visitor immediately starts seeing a faux 404 on all portals.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="ip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP address</FormLabel>
                    <FormControl>
                      <Input placeholder="203.0.113.10" className="h-10 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration in hours (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Leave blank for permanent"
                        className="h-10 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ban IP"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}