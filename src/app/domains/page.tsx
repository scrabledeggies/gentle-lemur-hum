"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Globe, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { AdminHeader } from "@/components/admin-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import type { PortalDomain } from "@/types/portal";

const domainSchema = z.object({
  domain_name: z
    .string()
    .min(1, "Domain is required")
    .regex(/^([a-z0-9-]+\.)+[a-z]{2,}$/i, "Enter a valid root domain"),
  max_subdomains: z.coerce.number().int().min(1).max(1000),
});

type DomainFormValues = z.infer<typeof domainSchema>;

export default function DomainsPage() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  const [domains, setDomains] = useState<PortalDomain[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<PortalDomain | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema),
    defaultValues: { domain_name: "", max_subdomains: 10 },
  });

  useEffect(() => {
    if (!isLoading && !session) router.replace("/login");
  }, [isLoading, session, router]);

  const fetchDomains = useCallback(async () => {
    setIsFetching(true);
    const { data, error } = await supabase
      .from("domains")
      .select("*")
      .order("domain_name", { ascending: true });
    if (error) {
      toast.error("Failed to load domains");
    } else {
      setDomains((data as PortalDomain[]) ?? []);
    }
    setIsFetching(false);
  }, []);

  useEffect(() => {
    if (session) fetchDomains();
  }, [session, fetchDomains]);

  const onSubmit = async (values: DomainFormValues) => {
    setIsSubmitting(true);
    const { error } = await supabase.from("domains").insert({
      domain_name: values.domain_name.toLowerCase(),
      max_subdomains: values.max_subdomains,
    });
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Domain added");
    setDialogOpen(false);
    form.reset({ domain_name: "", max_subdomains: 10 });
    fetchDomains();
  };

  const onDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    const { error } = await supabase.from("domains").delete().eq("id", deleting.id);
    setIsDeleting(false);
    setDeleting(null);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Domain removed");
    fetchDomains();
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
            <h2 className="text-xl font-semibold">Domains</h2>
            <p className="text-sm text-muted-foreground">
              Root domains that route portal subdomains to this console.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Add domain
          </Button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-background shadow-sm animate-in fade-in duration-500">
          {isFetching ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : domains.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <Globe className="h-7 w-7" />
              </div>
              <h3 className="font-semibold">No domains yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add a root domain (e.g. example.com) whose subdomains will serve portals.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Max subdomains</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-medium">{domain.domain_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {domain.max_subdomains}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => setDeleting(domain)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add domain</DialogTitle>
            <DialogDescription>
              Requests to any subdomain of this domain will be routed to a portal.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="domain_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Root domain</FormLabel>
                    <FormControl>
                      <Input placeholder="example.com" className="h-10 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="max_subdomains"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max subdomains</FormLabel>
                    <FormControl>
                      <Input type="number" className="h-10 rounded-xl" {...field} />
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
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add domain"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleting?.domain_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Subdomains under this domain will stop routing to portals. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              disabled={isDeleting}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}