"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClientForm } from "./client-form";
import { createClientAction } from "@/app/(studio)/dashboard/features/clients/actions/clients";
import { toast } from "sonner";

interface CreateClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateClientModal({ open, onOpenChange }: CreateClientModalProps) {
  const router = useRouter();

  const handleSave = async (data: {
    ca_user_id: string;
    name: string;
    email: string;
    description?: string;
    is_active: boolean;
    allow_custom_logo: boolean;
  }) => {
    const result = await createClientAction({
      ca_user_id: data.ca_user_id,
      name: data.name,
      email: data.email,
      description: data.description?.trim() || null,
      is_active: data.is_active,
      allow_custom_logo: data.allow_custom_logo,
    });
    if (result.error) throw new Error(result.error);
    toast.success("Client created");
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant/10 rounded-2xl shadow-sm shadow-on-surface/5 max-h-[90dvh] overflow-y-auto"
        showCloseButton
      >
        <DialogHeader className="mb-4 pb-4 border-b border-outline-variant/10">
          <DialogTitle className="text-2xl font-extrabold tracking-tight text-on-surface">
            New Client
          </DialogTitle>
          <DialogDescription className="text-on-surface-variant">
            Create a new client and associate its assets.
          </DialogDescription>
        </DialogHeader>
        <ClientForm onSave={handleSave} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
