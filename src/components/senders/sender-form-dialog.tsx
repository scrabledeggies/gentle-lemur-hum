"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { SenderIdentity } from "@/types/sender";
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

const senderSchema = z.object({
  display_name: z.string().min(1, "Display name is required"),
  from_email: z.string().email("Enter a valid email address"),
});

type SenderFormValues = z.infer<typeof senderSchema>;

interface SenderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sender: SenderIdentity | null;
  onSaved: () => void;
}

export function SenderFormDialog({ open, onOpenChange, sender, onSaved }: SenderFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!sender;

  const form = useForm<SenderFormValues>({
    resolver: zodResolver(senderSchema),
    defaultValues: { display_name: "", from_email: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      display_name: sender?.display_name ?? "",
      from_email: sender?.from_email ?? "",
    });
  }, [open, sender, form]);

  const onSubmit = async (values: SenderFormValues) => {
    setIsSubmitting(true);

    const { error } = isEditing
      ? await supabase
          .from("sender_identities")
          .update({ display_name: values.display_name, from_email: values.from_email })
          .eq("id", sender!.id)
      : await supabase.from("sender_identities").insert({
          display_name: values.display_name,
          from_email: values.from_email,
        });

    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(isEditing ? "Sender updated" : "Sender added");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit sender" : "Add sender"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this sender identity's details."
              : "Add a new 'from' identity for outgoing emails."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane from Support" className="h-10 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="from_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="jane@example.com"
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
                  "Add sender"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}