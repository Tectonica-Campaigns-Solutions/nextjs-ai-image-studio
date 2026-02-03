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
import { createClientAction } from "@/app/(studio)/dashboard/actions/clients";

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
  }) => {
    const result = await createClientAction({
      ca_user_id: data.ca_user_id,
      name: data.name,
      email: data.email,
      description: data.description?.trim() || null,
      is_active: data.is_active,
    });
    if (result.error) throw new Error(result.error);
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
          <DialogDescription>
            Create a new client and associate its assets.
          </DialogDescription>
        </DialogHeader>
        <ClientForm
          onSave={handleSave}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
