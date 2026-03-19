"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import type { Client } from "@/app/(studio)/dashboard/types";
import { updateClientAction } from "@/app/(studio)/dashboard/actions/clients";

interface ClientDetailHeaderFormProps {
  client: Client;
  variants: string[];
  clientId: string;
  galleryAssetsSlot: React.ReactNode;
  galleryRestSlot: React.ReactNode;
}

export function ClientDetailHeaderForm({
  client,
  clientId,
  galleryAssetsSlot,
  galleryRestSlot,
}: ClientDetailHeaderFormProps) {
  const router = useRouter();
  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email ?? "");
  const [description, setDescription] = useState(client.description ?? "");
  const [isActive, setIsActive] = useState(client.is_active);
  const [allowCustomLogo, setAllowCustomLogo] = useState(
    client.allow_custom_logo ?? true
  );
  const [saving, setSaving] = useState(false);

  const isDirty = useMemo(
    () =>
      name !== client.name ||
      email !== (client.email ?? "") ||
      description !== (client.description ?? "") ||
      isActive !== client.is_active ||
      allowCustomLogo !== (client.allow_custom_logo ?? true),
    [name, email, description, isActive, allowCustomLogo, client]
  );

  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    },
    [isDirty]
  );

  useEffect(() => {
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [handleBeforeUnload]);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateClientAction(clientId, {
      name,
      email,
      description: description || null,
      is_active: isActive,
      allow_custom_logo: allowCustomLogo,
    });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Changes saved");
    router.refresh();
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/clients")}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1 text-balance">
                {client.name}
              </h1>
              <p className="text-muted-foreground text-sm text-pretty">
                Edit client, manage assets and fonts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {isDirty && (
              <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700">
                Unsaved changes
              </Badge>
            )}
            <Button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="min-w-[140px]"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-card rounded-lg border border-border p-8">
            <h2 className="text-lg font-semibold text-foreground mb-6">
              Client Information
            </h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="ca_user_id" className="text-sm font-medium">
                  CA User ID
                </Label>
                <Input
                  id="ca_user_id"
                  value={client.ca_user_id}
                  readOnly
                  className="font-mono text-sm bg-muted text-muted-foreground"
                />
                <span className="text-xs text-muted-foreground">
                  (ID used in image-editor)
                </span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name of the client"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description of the client (optional)"
                  rows={4}
                  className="resize-none"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label
                    htmlFor="is_active"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Active Status
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    The client will be available to use its assets and fonts
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label
                    htmlFor="allow_custom_logo"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Allow custom logo upload
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    When enabled, users can upload their own logo in the studio
                    under Logo overlay
                  </p>
                </div>
                <Switch
                  id="allow_custom_logo"
                  checked={allowCustomLogo}
                  onCheckedChange={setAllowCustomLogo}
                />
              </div>
            </div>
          </div>

          <div className="min-h-[200px]">{galleryAssetsSlot}</div>
        </div>
        {galleryRestSlot}
    </div>
  );
}
