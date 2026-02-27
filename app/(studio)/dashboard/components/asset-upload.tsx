"use client";

import { useState, useRef } from "react";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2 } from "lucide-react";

const COMMON_ASPECT_RATIOS = [
  { value: "16:9", label: "16:9 — Landscape HD (1920×1080)" },
  { value: "9:16", label: "9:16 — Portrait / Stories (1080×1920)" },
  { value: "1:1", label: "1:1 — Square (1080×1080)" },
  { value: "4:3", label: "4:3 — Classic landscape (1024×768)" },
  { value: "3:4", label: "3:4 — Classic portrait (768×1024)" },
  { value: "4:5", label: "4:5 — Instagram portrait (1080×1350)" },
  { value: "5:4", label: "5:4 — Instagram landscape (1350×1080)" },
  { value: "3:2", label: "3:2 — DSLR landscape (1500×1000)" },
  { value: "2:3", label: "2:3 — DSLR portrait (1000×1500)" },
  { value: "21:9", label: "21:9 — Ultrawide (2560×1080)" },
] as const;

interface AssetUploadProps {
  clientId: string;
  variants?: string[];
  assetType?: string;
  variantPlaceholder?: string;
  onUploadComplete: () => void;
  onCancel: () => void;
}

export function AssetUpload({
  clientId,
  variants: existingVariants = [],
  assetType = "logo",
  variantPlaceholder = "e.g. C3, C4, etc.",
  onUploadComplete,
  onCancel,
}: AssetUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [variant, setVariant] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar tipo
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/svg+xml",
      "image/webp",
    ];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError(
        "File type not allowed. Only images (PNG, JPEG, SVG, WebP) are allowed"
      );
      return;
    }

    // Validar tamaño (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File is too large. Maximum size: 10MB");
      return;
    }

    // Validar dimensiones si es imagen (no SVG)
    if (selectedFile.type.startsWith("image/") && !selectedFile.type.includes("svg")) {
      try {
        const img = document.createElement("img");
        const url = URL.createObjectURL(selectedFile);

        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            URL.revokeObjectURL(url);
            if (img.width > 5000 || img.height > 5000) {
              reject(new Error(`Dimensions too large. Maximum: 5000x5000px. Actual: ${img.width}x${img.height}px`));
            } else {
              resolve();
            }
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Could not load image"));
          };
          img.src = url;
        });
      } catch (error) {
        setError(error instanceof Error ? error.message : "Error validating image");
        return;
      }
    }

    setFile(selectedFile);
    setError(null);

    // Generar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);

    // Auto-completar nombre si está vacío
    if (!name) {
      setName(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
    if (!displayName) {
      setDisplayName(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = async () => {
    if (!file || !name.trim()) {
      setError("Please select a file and provide a name");
      return;
    }
    if (assetType === "frame" && !variant.trim()) {
      setError("Please select an aspect ratio for this frame");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name.trim());
      formData.append("display_name", displayName.trim() || name.trim());
      formData.append("asset_type", assetType);
      formData.append("is_primary", isPrimary.toString());
      if (variant.trim()) {
        formData.append("variant", variant.trim());
      }

      const response = await fetch(
        `/api/dashboard/clients/${clientId}/assets`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to upload asset");
      }

      // Reset form
      setFile(null);
      setPreview(null);
      setName("");
      setDisplayName("");
      setVariant("");
      setIsPrimary(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onUploadComplete();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Error uploading asset"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setPreview(null);
    setName("");
    setDisplayName("");
    setVariant("");
    setIsPrimary(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onCancel();
  };

  return (
    <div className="space-y-4">
      {/* File Input */}
      <div className="space-y-2">
        <Label>File</Label>
        <div className="flex items-center gap-4">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
            onChange={handleFileSelect}
            disabled={uploading}
            className="cursor-pointer"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="space-y-2">
          <Label>Preview</Label>
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="relative w-full max-w-xs aspect-square mx-auto">
              <NextImage
                src={preview}
                alt="Preview"
                fill
                className="object-contain rounded"
                sizes="320px"
              />
            </div>
          </div>
        </div>
      )}

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="asset-name">Name *</Label>
        <Input
          id="asset-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name of the asset"
          disabled={uploading}
        />
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="asset-display-name">Display Name</Label>
        <Input
          id="asset-display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name for the UI"
          disabled={uploading}
        />
      </div>

      {/* Variant */}
      {assetType === "frame" ? (
        <div className="space-y-2">
          <Label htmlFor="asset-variant">
            Aspect Ratio <span className="text-destructive">*</span>
          </Label>
          <Select
            value={variant}
            onValueChange={setVariant}
            disabled={uploading}
          >
            <SelectTrigger id="asset-variant">
              <SelectValue placeholder="Select aspect ratio…" />
            </SelectTrigger>
            <SelectContent>
              {COMMON_ASPECT_RATIOS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The frame will only appear in the studio when the canvas matches this aspect ratio.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="asset-variant">Variant (Optional)</Label>
          <div className="relative">
            <Input
              id="asset-variant"
              list="variant-options"
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              placeholder={variantPlaceholder}
              disabled={uploading}
              maxLength={50}
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
            Select an existing variant or enter a new one
          </p>
        </div>
      )}

      {/* Is Primary */}
      <div className="flex items-center justify-between">
        <Label htmlFor="asset-primary">Mark as Primary</Label>
        <input
          id="asset-primary"
          type="checkbox"
          checked={isPrimary}
          onChange={(e) => setIsPrimary(e.target.checked)}
          disabled={uploading}
          className="h-4 w-4"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={handleCancel} disabled={uploading}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!file || !name.trim() || (assetType === "frame" && !variant.trim()) || uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Asset
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
