"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GOOGLE_FONTS, FONT_WEIGHTS, validateFontFile } from "../../standalone/studio/utils/studio-utils";
import { Checkbox } from "@/components/ui/checkbox";

interface FontUploadProps {
  clientId: string;
  onUploadComplete: () => void;
  onCancel: () => void;
}

export function FontUpload({
  clientId,
  onUploadComplete,
  onCancel,
}: FontUploadProps) {
  const [fontSource, setFontSource] = useState<"google" | "custom">("google");
  const [file, setFile] = useState<File | null>(null);
  const [fontFamily, setFontFamily] = useState("");
  const [selectedGoogleFont, setSelectedGoogleFont] = useState("");
  const [selectedWeights, setSelectedWeights] = useState<string[]>(["400"]);
  const [fontCategory, setFontCategory] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validation = validateFontFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Auto-complete font name if empty
    if (!fontFamily) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setFontFamily(nameWithoutExt);
    }
  };

  const handleGoogleFontChange = (fontName: string) => {
    setSelectedGoogleFont(fontName);
    setFontFamily(fontName);
    setError(null);
  };

  const handleWeightToggle = (weight: string) => {
    setSelectedWeights((prev) =>
      prev.includes(weight)
        ? prev.filter((w) => w !== weight)
        : [...prev, weight]
    );
  };

  const handleUpload = async () => {
    setError(null);

    // Validaciones
    if (fontSource === "google") {
      if (!selectedGoogleFont || !fontFamily.trim()) {
        setError("Please select a font from Google Fonts");
        return;
      }
      if (selectedWeights.length === 0) {
        setError("Please select at least one font weight");
        return;
      }
    } else if (fontSource === "custom") {
      if (!file) {
        setError("Please select a font file");
        return;
      }
      if (!fontFamily.trim()) {
        setError("Please provide a name for the font");
        return;
      }
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("font_source", fontSource);
      formData.append("font_family", fontFamily.trim());
      formData.append("font_weights", JSON.stringify(selectedWeights));
      if (fontCategory) {
        formData.append("font_category", fontCategory);
      }
      formData.append("is_primary", isPrimary.toString());

      if (fontSource === "custom" && file) {
        formData.append("file", file);
      }

      const response = await fetch(`/api/dashboard/clients/${clientId}/fonts`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to upload font");
      }

      // Reset form
      setFontSource("google");
      setFile(null);
      setFontFamily("");
      setSelectedGoogleFont("");
      setSelectedWeights(["400"]);
      setFontCategory("");
      setIsPrimary(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onUploadComplete();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Error uploading font"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setFontSource("google");
    setFile(null);
    setFontFamily("");
    setSelectedGoogleFont("");
    setSelectedWeights(["400"]);
    setFontCategory("");
    setIsPrimary(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onCancel();
  };

  return (
    <div className="space-y-5">
      {/* Font Source Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Font Type
          </Label>
          <Select
            value={fontSource}
            onValueChange={(value) => {
              setFontSource(value as "google" | "custom");
              setError(null);
              setFile(null);
              setFontFamily("");
              setSelectedGoogleFont("");
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
            disabled={uploading}
          >
            <SelectTrigger
              className="stitch-input w-full !bg-surface-container-low !border-outline-variant/10 rounded-xl !px-4 !py-2 shadow-none focus-visible:ring-stitch-primary/20 focus-visible:border-stitch-primary"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl shadow-sm p-1">
              <SelectItem value="google">Google Fonts</SelectItem>
              <SelectItem value="custom">Custom Font</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="font-category"
            className="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
          >
            Category
          </Label>
          <Select
            value={fontCategory}
            onValueChange={setFontCategory}
            disabled={uploading}
          >
            <SelectTrigger
              id="font-category"
              className="stitch-input w-full !bg-surface-container-low !border-outline-variant/10 rounded-xl !px-4 !py-2 shadow-none focus-visible:ring-stitch-primary/20 focus-visible:border-stitch-primary"
            >
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl shadow-sm p-1">
              <SelectItem value="sans-serif">Sans-serif</SelectItem>
              <SelectItem value="serif">Serif</SelectItem>
              <SelectItem value="display">Display</SelectItem>
              <SelectItem value="handwriting">Handwriting</SelectItem>
              <SelectItem value="monospace">Monospace</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {fontSource === "google" ? (
        <>
          {/* Google Fonts Selector */}
          <div className="space-y-2">
            <Label
              htmlFor="google-font"
              className="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
            >
              Google Fonts Font *
            </Label>
            <Select
              value={selectedGoogleFont}
              onValueChange={handleGoogleFontChange}
              disabled={uploading}
            >
              <SelectTrigger
                id="google-font"
                className="stitch-input w-full !bg-surface-container-low !border-outline-variant/10 rounded-xl !px-4 !py-2 shadow-none focus-visible:ring-stitch-primary/20 focus-visible:border-stitch-primary"
              >
                <SelectValue placeholder="Select a font" />
              </SelectTrigger>
              <SelectContent className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl shadow-sm p-1 max-h-48 overflow-y-auto overflow-x-hidden">
                {GOOGLE_FONTS.map((font) => (
                  <SelectItem key={font.family} value={font.family}>
                    {font.family}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Weights for Google Fonts */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Font Weights *
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FONT_WEIGHTS.map((weight) => (
                <button
                  key={weight.value}
                  type="button"
                  onClick={() => handleWeightToggle(weight.value)}
                  disabled={uploading}
                  aria-pressed={selectedWeights.includes(weight.value)}
                  className={
                    selectedWeights.includes(weight.value)
                      ? "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stitch-primary/30 bg-stitch-primary/10 text-stitch-primary hover:bg-stitch-primary/15 transition-colors"
                      : "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-outline-variant/10 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  }
                >
                  <Checkbox
                    id={`weight-${weight.value}`}
                    checked={selectedWeights.includes(weight.value)}
                    onCheckedChange={() => handleWeightToggle(weight.value)}
                    disabled={uploading}
                    className="pointer-events-none"
                  />
                  <span className="text-xs font-semibold">
                    {weight.label} ({weight.value})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Custom Font File Upload */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Font File *
              </Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".ttf,.woff,.woff2,.otf,font/ttf,font/woff,font/woff2,font/otf"
                onChange={handleFileSelect}
                disabled={uploading}
                className="stitch-input w-full !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 shadow-none focus-visible:ring-stitch-primary/20 focus-visible:border-stitch-primary cursor-pointer"
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Selected file: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            {/* Custom Font Family Name */}
            <div className="space-y-2">
              <Label
                htmlFor="custom-font-family"
                className="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
              >
                Font Name *
              </Label>
              <Input
                id="custom-font-family"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                placeholder="e.g. My Custom Font"
                disabled={uploading}
                className="stitch-input w-full !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 shadow-none focus-visible:ring-stitch-primary/20 focus-visible:border-stitch-primary"
              />
            </div>
          </div>

          {/* Font Weights for Custom Fonts */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Font Weights (optional)
            </Label>
            <p className="text-xs text-muted-foreground">
              Select the available weights for this font
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FONT_WEIGHTS.map((weight) => (
                <button
                  key={weight.value}
                  type="button"
                  onClick={() => handleWeightToggle(weight.value)}
                  disabled={uploading}
                  aria-pressed={selectedWeights.includes(weight.value)}
                  className={
                    selectedWeights.includes(weight.value)
                      ? "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stitch-primary/30 bg-stitch-primary/10 text-stitch-primary hover:bg-stitch-primary/15 transition-colors"
                      : "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-outline-variant/10 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  }
                >
                  <Checkbox
                    id={`custom-weight-${weight.value}`}
                    checked={selectedWeights.includes(weight.value)}
                    onCheckedChange={() => handleWeightToggle(weight.value)}
                    disabled={uploading}
                    className="pointer-events-none"
                  />
                  <span className="text-xs font-semibold">
                    {weight.label} ({weight.value})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between w-full rounded-xl bg-surface-container-low border border-outline-variant/10 p-4">
        {/* Is Primary */}
          <div>
            <Label
              htmlFor="font-primary"
              className="cursor-pointer text-xs font-bold uppercase tracking-widest text-on-surface-variant"
            >
              Mark as Primary
            </Label>
          </div>
          <Checkbox
            id="font-primary"
            checked={isPrimary}
            onCheckedChange={(checked) => setIsPrimary(Boolean(checked))}
            disabled={uploading}
          />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-outline-variant/10">
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
            uploading ||
            (fontSource === "google" && !selectedGoogleFont) ||
            (fontSource === "custom" && (!file || !fontFamily.trim())) ||
            selectedWeights.length === 0
          }
        >
          {uploading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="size-4" />
              Add Font
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
