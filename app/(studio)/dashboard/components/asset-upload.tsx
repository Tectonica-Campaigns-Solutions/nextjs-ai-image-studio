"use client";

import { useState, useRef, useCallback } from "react";
import NextImage from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { COMMON_ASPECT_RATIOS } from "@/lib/aspect-ratios";
import { cn } from "@/lib/utils";

interface AssetUploadProps {
  clientId: string;
  variants?: string[];
  assetType?: string;
  variantPlaceholder?: string;
  onUploadComplete: () => void;
  onCancel: () => void;
}

type FileQueueItem = {
  id: string;
  file: File;
  preview: string | null;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  name: string;
  displayName: string;
};

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
  "image/webp",
];

export function AssetUpload({
  clientId,
  variants: existingVariants = [],
  assetType = "logo",
  variantPlaceholder = "e.g. C3, C4, etc.",
  onUploadComplete,
  onCancel,
}: AssetUploadProps) {
  const [queue, setQueue] = useState<FileQueueItem[]>([]);
  const [variant, setVariant] = useState("");
  const [frameVariantAll, setFrameVariantAll] = useState(false);
  const [frameVariantRatios, setFrameVariantRatios] = useState<string[]>([]);
  const [isPrimary, setIsPrimary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;
      setError(null);

      const newItems: FileQueueItem[] = [];

      for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          setError(`"${file.name}" skipped: unsupported type`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          setError(`"${file.name}" skipped: exceeds 10MB`);
          continue;
        }

        let preview: string | null = null;
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        try {
          preview = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        } catch {
          // no preview
        }

        newItems.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          preview,
          status: "pending",
          name: baseName,
          displayName: baseName,
        });
      }

      setQueue((prev) => [...prev, ...newItems]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    []
  );

  const removeFromQueue = useCallback((id: string) => {
      setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleUpload = async () => {
    const pending = queue.filter((item) => item.status === "pending");
    if (pending.length === 0) {
      setError("No files to upload");
      return;
    }

    const frameVariantValue =
      assetType === "frame"
        ? frameVariantAll
          ? "*"
          : frameVariantRatios.join(",")
        : variant.trim();

    if (assetType === "frame" && !frameVariantValue) {
      setError(
        'Please select at least one aspect ratio or "All aspect ratios"'
      );
      return;
    }

    setUploading(true);
    setError(null);
    let successCount = 0;

    for (const item of pending) {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id ? { ...q, status: "uploading" as const } : q
        )
      );

      try {
        const formData = new FormData();
        formData.append("file", item.file);
        const baseName = item.file.name.replace(/\.[^/.]+$/, "");
        const effectiveName = item.name.trim() || baseName;
        const effectiveDisplayName =
          assetType === "frame"
            ? (item.displayName?.trim() || effectiveName)
            : effectiveName;
        formData.append("name", effectiveName);
        formData.append("display_name", effectiveDisplayName);
        formData.append("asset_type", assetType);
        formData.append(
          "is_primary",
          (isPrimary && successCount === 0).toString()
        );
        const variantValue =
          assetType === "frame" ? frameVariantValue : variant.trim();
        if (variantValue) {
          formData.append("variant", variantValue);
        }

        const response = await fetch(
          `/api/dashboard/clients/${clientId}/assets`,
          { method: "POST", body: formData }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Upload failed");
        }

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: "done" as const } : q
          )
        );
        successCount++;
      } catch (err) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                ...q,
                status: "error" as const,
                error:
                  err instanceof Error ? err.message : "Upload failed",
              }
              : q
          )
        );
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(
        `${successCount} file${successCount !== 1 ? "s" : ""} uploaded`
      );
      onUploadComplete();
    }
  };

  const handleCancel = () => {
    setQueue([]);
    setVariant("");
    setFrameVariantAll(false);
    setFrameVariantRatios([]);
    setIsPrimary(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onCancel();
  };

  const pendingCount = queue.filter((q) => q.status === "pending").length;

  return (
    <div className="space-y-5">
      {/* File Input */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Files
        </Label>
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
          onChange={handleFileSelect}
          disabled={uploading}
          multiple
          className="dashboard-input !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 shadow-none cursor-pointer focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
        />
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            {queue.length} file{queue.length !== 1 ? "s" : ""} selected
          </Label>
          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-2 max-h-72 overflow-y-auto">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 text-sm hover:bg-surface-container-high transition-colors rounded-lg"
              >
                {item.preview && (
                  <div className="relative size-8 flex-shrink-0 rounded overflow-hidden bg-muted">
                    <NextImage
                      src={item.preview}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="truncate text-xs text-on-surface-variant/80">
                    {item.file.name}
                  </p>
                  <Input
                    value={item.name}
                    onChange={(e) =>
                      setQueue((prev) =>
                        prev.map((q) =>
                          q.id === item.id ? { ...q, name: e.target.value } : q
                        )
                      )
                    }
                    disabled={uploading || item.status !== "pending"}
                    placeholder="Name"
                    className="h-8 text-xs px-2 py-1 bg-surface-container-lowest border-outline-variant/30"
                  />
                  {assetType === "frame" && (
                    <Input
                      value={item.displayName}
                      onChange={(e) =>
                        setQueue((prev) =>
                          prev.map((q) =>
                            q.id === item.id
                              ? { ...q, displayName: e.target.value }
                              : q
                          )
                        )
                      }
                      disabled={uploading || item.status !== "pending"}
                      placeholder="Display name"
                      className="h-8 text-xs px-2 py-1 bg-surface-container-lowest border-outline-variant/30"
                    />
                  )}
                </div>
                {item.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => removeFromQueue(item.id)}
                    className="text-on-surface-variant hover:text-on-surface transition-colors"
                    aria-label="Remove"
                    disabled={uploading}
                  >
                    <X className="size-3.5" />
                  </button>
                )}
                {item.status === "uploading" && (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                )}
                {item.status === "done" && (
                  <CheckCircle2 className="size-4 text-green-600" />
                )}
                {item.status === "error" && (
                  <span
                    className="flex items-center gap-1 text-destructive"
                    title={item.error}
                  >
                    <AlertCircle className="size-4" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Variant / Aspect Ratios */}
      {assetType === "frame" ? (
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Aspect ratio(s) <span className="text-destructive">*</span>
          </Label>
          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-4 space-y-3 max-h-[220px] overflow-y-auto">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={frameVariantAll}
                onCheckedChange={(checked) => {
                  setFrameVariantAll(!!checked);
                  if (checked) setFrameVariantRatios([]);
                }}
                disabled={uploading}
              />
              <span className="text-sm font-medium">All aspect ratios</span>
            </label>
            {!frameVariantAll &&
              COMMON_ASPECT_RATIOS.map(({ value, label }) => (
                <label
                  key={value}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={frameVariantRatios.includes(value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFrameVariantRatios((prev) =>
                          prev.includes(value) ? prev : [...prev, value]
                        );
                      } else {
                        setFrameVariantRatios((prev) =>
                          prev.filter((r) => r !== value)
                        );
                      }
                    }}
                    disabled={uploading}
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
          </div>
          <p className="text-xs text-muted-foreground text-pretty">
            The frame will appear in the studio when the canvas matches any
            selected aspect ratio (or all if you choose &quot;All aspect
            ratios&quot;).
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label
            htmlFor="asset-variant"
            className="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
          >
            Variant (Optional)
          </Label>
          <div className="relative">
            <Input
              id="asset-variant"
              list="variant-options"
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              placeholder={variantPlaceholder}
              disabled={uploading}
              maxLength={50}
              className="dashboard-input !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 shadow-none focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
            />
            {existingVariants.length > 0 && (
              <datalist id="variant-options">
                {existingVariants.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Applied to all files. Select an existing variant or enter a new one.
          </p>
        </div>
      )}

      {/* Is Primary */}
      <div className="flex items-center justify-between">
        <Label
          htmlFor="asset-primary"
          className="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
        >
          Mark first file as Primary
        </Label>
        <Checkbox
          id="asset-primary"
          checked={isPrimary}
          onCheckedChange={(checked) => setIsPrimary(!!checked)}
          disabled={uploading}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/10">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={uploading}
          className="bg-surface-container-lowest border-outline-variant/10 hover:bg-surface-container-high hover:text-on-surface disabled:opacity-50"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleUpload}
          disabled={
            pendingCount === 0 ||
            (assetType === "frame" &&
              !frameVariantAll &&
              frameVariantRatios.length === 0) ||
            uploading
          }
          className="bg-dashboard-primary text-dashboard-on-primary border border-dashboard-primary/10 hover:opacity-90 shadow-sm shadow-dashboard-primary/20 disabled:opacity-70 hover:bg-dashboard-primary/90 hover:text-dashboard-on-primary"
        >
          {uploading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="size-4" />
              Upload {pendingCount > 1 ? `${pendingCount} Files` : "Asset"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
