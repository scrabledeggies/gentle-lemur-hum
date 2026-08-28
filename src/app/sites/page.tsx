"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, FileCode, Loader2, Pencil, Upload } from "lucide-react";
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
import type { HtmlSite } from "@/types/portal";

const uploadSchema = z.object({
  file: z.any(),
  name: z.string().optional(),
  category: z.string().optional(),
});
type UploadFormValues = z.infer<typeof uploadSchema>;

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().optional(),
  pages: z.string().optional(),
  autofill_keys: z.string().optional(),
});
type EditFormValues = z.infer<typeof editSchema>;

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const parsePages = (raw: string) =>
  raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((label) => ({ id: slugify(label) || label.toLowerCase(), label }));

const parseKeys = (raw: string) =>
  raw.split(",").map((s) => s.trim()).filter(Boolean);

function autofillKeysOf(site: HtmlSite): string[] {
  if (!Array.isArray(site.autofill_fields)) return [];
  return site.autofill_fields
    .map((f) => (typeof f === "string" ? f : (f as { key?: string })?.key))
    .filter((k): k is string => Boolean(k));
}

export default function SitesPage() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  const [sites, setSites] = useState<HtmlSite[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editSite, setEditSite] = useState<HtmlSite | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const uploadForm = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { name: "", category: "" },
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", category: "", pages: "", autofill_keys: "" },
  });

  useEffect(() => {
    if (!isLoading && !session) router.replace("/login");
  }, [isLoading, session, router]);

  const fetchSites = useCallback(async () => {
    setIsFetching(true);
    const { data, error } = await supabase
      .from("html_sites")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      toast.error("Failed to load sites");
    } else {
      setSites((data as HtmlSite[]) ?? []);
    }
    setIsFetching(false);
  }, []);

  useEffect(() => {
    if (session) fetchSites();
  }, [session, fetchSites]);

  const onUpload = async (values: UploadFormValues) => {
    const file = (values.file as FileList | undefined)?.[0];
    if (!file) {
      toast.error("Choose an HTML file to upload");
      return;
    }

    setIsUploading(true);
    const {
      data: { session: current },
    } = await supabase.auth.getSession();

    const fd = new FormData();
    fd.append("file", file);
    if (values.name?.trim()) fd.append("name", values.name.trim());
    if (values.category?.trim()) fd.append("category", values.category.trim());

    const res = await fetch("/api/admin/upload-site", {
      method: "POST",
      headers: { Authorization: `Bearer ${current?.access_token ?? ""}` },
      body: fd,
    });
    const json = await res.json();
    setIsUploading(false);

    if (!res.ok) {
      toast.error(json.error ?? "Upload failed");
      return;
    }
    toast.success("Site uploaded");
    setUploadOpen(false);
    uploadForm.reset({ name: "", category: "" });
    fetchSites();
  };

  const openEdit = (site: HtmlSite) => {
    setEditSite(site);
    const pageLabels = Array.isArray(site.pages)
      ? site.pages.map((p) => p.label ?? p.id).filter(Boolean).join(", ")
      : "";
    editForm.reset({
      name: site.name ?? "",
      category: site.category ?? "",
      pages: pageLabels,
      autofill_keys: autofillKeysOf(site).join(", "),
    });
  };

  const onSaveEdit = async (values: EditFormValues) => {
    if (!editSite) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("html_sites")
      .update({
        name: values.name,
        category: values.category?.trim() || null,
        pages: parsePages(values.pages ?? ""),
        autofill_fields: parseKeys(values.autofill_keys ?? ""),
      })
      .eq("id", editSite.id);
    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Site updated");
    setEditSite(null);
    fetchSites();
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
            <h2 className="text-xl font-semibold">Portal Sites</h2>
            <p className="text-sm text-muted-foreground">
              HTML experiences served on portal subdomains, with pages and autofill fields.
            </p>
          </div>
          <Button onClick={() => setUploadOpen(true)} className="rounded-xl">
            <Upload className="mr-2 h-4 w-4" />
            Upload site
          </Button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-background shadow-sm animate-in fade-in duration-500">
          {isFetching ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <FileCode className="h-7 w-7" />
              </div>
              <h3 className="font-semibold">No sites yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Upload an HTML portal, then link it to a subdomain so KC can route clients to it.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead>Autofill keys</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => {
                  const keys = autofillKeysOf(site);
                  return (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">{site.name ?? "Untitled"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {site.category ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {Array.isArray(site.pages) ? site.pages.length : 0}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {keys.slice(0, 3).map((k) => (
                            <span
                              key={k}
                              className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
                            >
                              {k}
                            </span>
                          ))}
                          {keys.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{keys.length - 3}
                            </span>
                          )}
                          {keys.length === 0 && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => openEdit(site)}
                        >
                          <Pencil className="h-4 w-4" />
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

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload site</DialogTitle>
            <DialogDescription>
              Upload a self-contained HTML file. It is stored in the portals bucket.
            </DialogDescription>
          </DialogHeader>
          <Form {...uploadForm}>
            <form onSubmit={uploadForm.handleSubmit(onUpload)} className="space-y-4">
              <FormItem>
                <FormLabel>HTML file</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept=".html,.htm,text/html"
                    className="h-10 rounded-xl"
                    {...uploadForm.register("file")}
                  />
                </FormControl>
              </FormItem>
              <FormField
                control={uploadForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Support portal" className="h-10 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={uploadForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="banking" className="h-10 rounded-xl" {...field} />
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
                  onClick={() => setUploadOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUploading} className="rounded-xl">
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editSite} onOpenChange={() => setEditSite(null)}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit site</DialogTitle>
            <DialogDescription>
              Pages and autofill keys are exposed to KC via the categories endpoint.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onSaveEdit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input className="h-10 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="banking" className="h-10 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="pages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pages (comma separated)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Login, Verify, Success"
                        className="h-10 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="autofill_keys"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Autofill keys (comma separated)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="username, password, otp"
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
                  onClick={() => setEditSite(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="rounded-xl">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}