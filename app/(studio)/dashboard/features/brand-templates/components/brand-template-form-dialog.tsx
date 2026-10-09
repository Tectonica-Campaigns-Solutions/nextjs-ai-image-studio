"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Palette, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardDialogContent } from "@/app/(studio)/dashboard/components/dashboard-dialog-content";
import type { BrandTemplate, BrandTemplateVariant } from "@/lib/brand-templates/types";
import type { BrandTemplateInput } from "@/lib/brand-templates/schemas";
import {
  createBrandTemplateAction,
  updateBrandTemplateAction,
} from "../actions/brand-templates";

const INPUT_CLASS =
  "dashboard-input !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 shadow-none focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary";
const GLOBAL_VALUE = "__global__";

function newVariantId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export interface BrandTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create a new template. */
  template: BrandTemplate | null;
  clients: Array<{ id: string; name: string }>;
  /** Called with the template id after a successful save. */
  onSaved: (templateId: string) => void;
}

export function BrandTemplateFormDialog({
  open,
  onOpenChange,
  template,
  clients,
  onSaved,
}: BrandTemplateFormDialogProps) {
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [variants, setVariants] = useState<BrandTemplateVariant[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(template?.name ?? "");
    setClientId(template?.client_id ?? null);
    setCategory(template?.category ?? "");
    setDescription(template?.description ?? "");
    setVariants(template?.variants ?? []);
  }, [open, template]);

  const updateVariant = (id: string, patch: Partial<BrandTemplateVariant>) =>
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  const addColorVariant = () =>
    setVariants((prev) => [
      ...prev,
      { id: newVariantId(), kind: "color", value: "#1D4ED8", label: "" },
    ]);

  const handleImageSelected = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/dashboard/brand-templates/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setVariants((prev) => [
        ...prev,
        {
          id: newVariantId(),
          kind: "image",
          value: data.url as string,
          label: file.name.replace(/\.[^/.]+$/, "").slice(0, 60),
        },
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const input: BrandTemplateInput = {
      name,
      client_id: clientId,
      category,
      description,
      variants: variants.map((v) => ({ ...v, label: v.label?.trim() || undefined })),
      is_active: template?.is_active ?? false,
    };
    const result = template
      ? await updateBrandTemplateAction(template.id, input)
      : await createBrandTemplateAction(input);
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(template ? "Template updated" : "Template created");
    onOpenChange(false);
    onSaved(template?.id ?? (result as { id: string }).id);
  };

  const busy = saving || uploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DashboardDialogContent className="sm:max-w-xl">
        <DialogHeader className="mb-4 pb-4 border-b border-outline-variant/10">
          <DialogTitle className="text-2xl font-extrabold tracking-tight text-on-surface">
            {template ? "Edit template" : "New template"}
          </DialogTitle>
          <DialogDescription className="text-on-surface-variant">
            Details and background variants. Layouts are designed per format in the Studio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="space-y-2">
            <Label htmlFor="bt-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="bt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rally announcement"
              disabled={busy}
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bt-client">Available to</Label>
              <Select
                value={clientId ?? GLOBAL_VALUE}
                onValueChange={(v) => setClientId(v === GLOBAL_VALUE ? null : v)}
                disabled={busy}
              >
                <SelectTrigger
                  id="bt-client"
                  className="dashboard-input rounded-xl px-4 shadow-none w-full bg-surface-container-low !border-outline-variant/10"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-container-lowest border-outline-variant/10">
                  <SelectItem value={GLOBAL_VALUE}>All clients (global)</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bt-category">Category</Label>
              <Input
                id="bt-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Events"
                disabled={busy}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bt-description">Description</Label>
            <Textarea
              id="bt-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="When to use this template (optional)"
              rows={2}
              disabled={busy}
              className="resize-none bg-surface-container-low border-outline-variant/10 rounded-xl shadow-none focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
            />
          </div>

          <div className="space-y-3">
            <div>
              <Label>Background variants</Label>
              <p className="text-muted-foreground mt-1 text-xs">
                Users switch between these. The first color is used while designing layouts.
              </p>
            </div>

            {variants.length > 0 ? (
              <ul className="space-y-2">
                {variants.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center gap-3 rounded-xl bg-surface-container-low border border-outline-variant/10 p-2"
                  >
                    {v.kind === "color" ? (
                      <input
                        type="color"
                        aria-label="Background color"
                        value={v.value}
                        onChange={(e) => updateVariant(v.id, { value: e.target.value.toUpperCase() })}
                        disabled={busy}
                        className="size-10 shrink-0 cursor-pointer rounded-lg border border-outline-variant/20 bg-transparent p-0.5"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.value}
                        alt=""
                        className="size-10 shrink-0 rounded-lg object-cover border border-outline-variant/20"
                      />
                    )}
                    <Input
                      value={v.label ?? ""}
                      onChange={(e) => updateVariant(v.id, { label: e.target.value })}
                      placeholder={v.kind === "color" ? v.value : "Image label"}
                      aria-label="Variant label"
                      disabled={busy}
                      className={`${INPUT_CLASS} h-10`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove variant"
                      onClick={() => setVariants((prev) => prev.filter((x) => x.id !== v.id))}
                      disabled={busy}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-outline-variant/30 p-4 text-center text-sm text-on-surface-variant">
                No variants yet.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={addColorVariant}
                disabled={busy}
                className="gap-2 bg-surface-container-lowest border-outline-variant/10"
              >
                <Palette className="size-4" /> Add color
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="gap-2 bg-surface-container-lowest border-outline-variant/10"
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                Add image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => void handleImageSelected(e.target.files?.[0])}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="bg-surface-container-lowest border-outline-variant/10 hover:bg-surface-container-high hover:text-on-surface disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || !name.trim()}
              className="min-w-[140px] gap-2 bg-dashboard-primary text-dashboard-on-primary border border-dashboard-primary/10 hover:bg-dashboard-primary/90 hover:text-dashboard-on-primary shadow-sm shadow-dashboard-primary/20 disabled:opacity-70"
            >
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
      </DashboardDialogContent>
    </Dialog>
  );
}
