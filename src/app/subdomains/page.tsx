"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Network, Plus, Power, PowerOff } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { HtmlSite, PortalDomain, PortalSubdomain } from "@/types/portal";

const subdomainSchema = z.object({
  prefix: z
    .string()
    .min(1, "Prefix is required")
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, "Lowercase letters, numbers and dashes only"),
  domain_id: z.string().min(1, "Pick a domain"),
  html_site_id: z.string().optional(),
});

type SubdomainFormValues = z.infer<typeof subdomainSchema>;

export default function SubdomainsPage() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  const [subdomains, setSubdomains] = useState<PortalSubdomain[]>([]);
  const [domains, setDomains] = useState<PortalDomain[]>([]);
  const [sites, setSites] = useState<HtmlSite[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const form = useForm<SubdomainFormValues>({
    resolver: zodResolver(subdomainSchema),
    defaultValues: { prefix: "", domain_id: "", html_site_id: "none" },
  });

  useEffect(() => {
    if (!isLoading && !session) router.replace("/login");
  }, [isLoading, session, router]);

  const fetchAll = useCallback(async () => {
    setIsFetching(true);
    const [subsRes, domainsRes, sitesRes] = await Promise.all([
      supabase
        .from("subdomains")
        .select("*, domains(domain_name), html_sites(name)")
        .order("prefix", { ascending: true }),
      supabase.from("domains").select("*").order("domain_name", { ascending: true }),
      supabase.from("html_sites").select("id, name").order("name", { ascending: true }),
    ]);

    if (subsRes.error) toast.error("Failed to load subdomains");
    else setSubdomains((subsRes.data as unknown as PortalSubdomain[]) ?? []);

    setDomains((domainsRes.data as PortalDomain[]) ?? []);
    setSites((sitesRes.data as HtmlSite[]) ?? []);
    setIsFetching(false);
  }, []);

  useEffect(() => {
    if (session) fetchAll();
  }, [session, fetchAll]);

  const onSubmit = async (values: SubdomainFormValues) => {
    const domain = domains.find((d) => d.id === values.domain_id);
    const existing = subdomains.filter((s) => s.domain_id === values.domain_id).length;
    if (domain && existing >= domain.max_subdomains) {
      toast.error(`${domain.domain_name} allows at most ${domain.max_subdomains} subdomains`);
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("subdomains").insert({
      prefix: values.prefix.toLowerCase(),
      domain_id: values.domain_id,
      html_site_id: !values.html_site_id || values.html_site_id === "none" ? null : values.html_site_id,
      status: "active",
    });
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Subdomain created");
    setDialogOpen(false);
    form.reset({ prefix: "", domain_id: "", html_site_id: "none" });
    fetchAll();
  };

  const onToggle = async (sub: PortalSubdomain) => {
    const next = sub.status === "active" ? "suspended" : "active";
    setTogglingId(sub.id);
    const { error } = await supabase
      .from("subdomains")
      .update({ status: next })
      .eq("id", sub.id);
    setTogglingId(null);

    if (error) {
      toast.error("Failed to update subdomain");
      return;
    }
    toast.success(next === "active" ? "Subdomain activated" : "Subdomain suspended");
    fetchAll();
  };

  const hostOf = (sub: PortalSubdomain) =>
    sub.domains?.domain_name ? `${sub.prefix}.${sub.domains.domain_name}` : sub.prefix;

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
            <h2 className="text-xl font-semibold">Subdomains</h2>
            <p className="text-sm text-muted-foreground">
              Portal hostnames served by the router. Each one can point at a portal site.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Add subdomain
          </Button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-background shadow-sm animate-in fade-in duration-500">
          {isFetching ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : subdomains.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <Network className="h-7 w-7" />
              </div>
              <h3 className="font-semibold">No subdomains yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Create a subdomain on one of your domains and link it to a portal site.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hostname</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subdomains.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{hostOf(sub)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {sub.html_sites?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                          sub.status === "active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            sub.status === "active" ? "bg-emerald-500" : "bg-slate-400",
                          )}
                        />
                        {sub.status === "active" ? "Active" : "Suspended"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        disabled={togglingId === sub.id}
                        onClick={() => onToggle(sub)}
                      >
                        {togglingId === sub.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : sub.status === "active" ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
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
            <DialogTitle>Add subdomain</DialogTitle>
            <DialogDescription>
              The hostname goes live as soon as DNS points at this deployment.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="prefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prefix</FormLabel>
                    <FormControl>
                      <Input placeholder="portal" className="h-10 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="domain_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue placeholder="Pick a domain" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {domains.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.domain_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="html_site_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portal site (optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue placeholder="No site linked" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No site linked</SelectItem>
                        {sites.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name ?? "Untitled"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}