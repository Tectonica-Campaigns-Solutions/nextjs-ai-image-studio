"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientFormProps {
  clientId?: string;
  initialData?: {
    ca_user_id?: string;
    name?: string;
    email?: string;
    description?: string;
    is_active?: boolean;
  };
  onSave: (data: {
    ca_user_id: string;
    name: string;
    email: string;
    description?: string;
    is_active: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
}

export function ClientForm({
  clientId,
  initialData,
  onSave,
  onCancel,
}: ClientFormProps) {
  const [caUserId, setCaUserId] = useState(initialData?.ca_user_id || "");
  const [name, setName] = useState(initialData?.name || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [isActive, setIsActive] = useState(
    initialData?.is_active !== undefined ? initialData.is_active : true
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!caUserId.trim()) {
      setError("CA User ID is required");
      return;
    }

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Email is not valid");
      return;
    }

    try {
      setSaving(true);
      await onSave({
        ca_user_id: caUserId.trim(),
        name: name.trim(),
        email: email.trim(),
        description: description.trim() || undefined,
        is_active: isActive,
      });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Error saving client"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("rounded-lg border bg-card p-6")}>
      <form onSubmit={handleSubmit} className="space-y-6" aria-describedby={error ? "client-form-error" : undefined}>
        {error && (
          <div
            id="client-form-error"
            className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="ca_user_id">
            CA User ID <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ca_user_id"
            value={caUserId}
            onChange={(e) => setCaUserId(e.target.value)}
            placeholder="ID of the user in Change Agent"
            disabled={!!clientId}
            className={cn(clientId && "bg-muted text-muted-foreground")}
          />
          {clientId && (
            <p className="text-muted-foreground mt-1 text-xs">
              The CA User ID cannot be modified
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name of the client"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description of the client (optional)"
            rows={4}
            className="resize-none"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
          <div>
            <Label htmlFor="is_active" className="cursor-pointer">
              Active status
            </Label>
            <p className="text-muted-foreground mt-1 text-xs">
              The client will be available to use its assets and fonts
            </p>
          </div>
          <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div className="flex justify-end gap-3 border-t pt-6">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={saving} className="min-w-[120px] gap-2">
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
