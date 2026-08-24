"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Relay } from "@/types/relay";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const relaySchema = z.object({
  name: z.string().min(1, "Name is required"),
  host: z.string().min(1, "Host is required"),
  port: z.coerce.number().int().min(1, "Invalid port").max(65535, "Invalid port"),
  username: z.string().min(1, "Username is required"),
  password: z.string().optional(),
  daily_limit: z.coerce.number().int().min(0, "Must be 0 or more"),
  status: z.enum(["healthy", "down", "disabled"]),
});

type RelayFormValues = z.infer<typeof relaySchema>;

interface RelayFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relay: Relay | null;
  onSaved: () => void;
}

export function RelayFormDialog({ open, onOpenChange, relay, onSaved }: RelayFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!relay;

  const form = useForm<RelayFormValues>({
    resolver: zodResolver(relaySchema),
    defaultValues: {
      name: "",
      host: "",
      port: 587,
      username: "",
      password: "",
      daily_limit: 1000,
      status: "healthy",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: relay?.name ?? "",
      host: relay?.host ?? "",
      port: relay?.port ?? 587,
      username: relay?.username ?? "",
      password: "",
      daily_limit: relay?.daily_limit ?? 1000,
      status: relay?.status ?? "healthy",
    });
  }, [open, relay, form]);

  const onSubmit = async (values: RelayFormValues) => {
    if (!isEditing && !values.password?.trim()) {
      form.setError("password", { message: "Password is required" });
      return;
    }

    setIsSubmitting(true);

    const { error } = isEditing
      ? await supabase.rpc("update_smtp_relay", {
          p_id: relay!.id,
          p_name: values.name,
          p_host: values.host,
          p_port: values.port,
          p_username: values.username,
          p_password: values.password?.trim() || null,
          p_daily_limit: values.daily_limit,
          p_status: values.status,
        })
      : await supabase.rpc("create_smtp_relay", {
          p_name: values.name,
          p_host: values.host,
          p_port: values.port,
          p_username: values.username,
          p_password: values.password!.trim(),
          p_daily_limit: values.daily_limit,
        });

    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(isEditing ? "Relay updated" : "Relay added");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit relay" : "Add relay"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update connection details for this relay server."
              : "Connect a new SMTP relay server."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Primary relay" className="h-10 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Host</FormLabel>
                    <FormControl>
                      <Input placeholder="smtp.example.com" className="h-10 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input type="number" className="h-10 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="relay-user" className="h-10 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isEditing ? "New password" : "Password"}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={isEditing ? "Leave blank to keep current" : "••••••••"}
                      className="h-10 rounded-xl"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="daily_limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily limit</FormLabel>
                    <FormControl>
                      <Input type="number" className="h-10 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditing && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="healthy">Healthy</SelectItem>
                          <SelectItem value="down">Down</SelectItem>
                          <SelectItem value="disabled">Disabled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl">
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isEditing ? (
                  "Save changes"
                ) : (
                  "Add relay"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}