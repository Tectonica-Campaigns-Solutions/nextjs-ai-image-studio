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
    <div className="space-y-4">
      {/* Font Source Selection */}
      <div className="space-y-2">
        <Label>Font Type</Label>
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
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="google">Google Fonts</SelectItem>
            <SelectItem value="custom">Custom Font</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {fontSource === "google" ? (
        <>
          {/* Google Fonts Selector */}
          <div className="space-y-2">
            <Label htmlFor="google-font">Google Fonts Font *</Label>
            <Select
              value={selectedGoogleFont}
              onValueChange={handleGoogleFontChange}
              disabled={uploading}
            >
              <SelectTrigger id="google-font">
                <SelectValue placeholder="Select a font" />
              </SelectTrigger>
              <SelectContent>
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
            <Label>Font Weights *</Label>
            <div className="flex flex-wrap gap-2">
              {FONT_WEIGHTS.map((weight) => (
                <div key={weight.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`weight-${weight.value}`}
                    checked={selectedWeights.includes(weight.value)}
                    onCheckedChange={() => handleWeightToggle(weight.value)}
                    disabled={uploading}
                  />
                  <Label
                    htmlFor={`weight-${weight.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {weight.label} ({weight.value})
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Custom Font File Upload */}
          <div className="space-y-2">
            <Label>Font File *</Label>
            <div className="flex items-center gap-4">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".ttf,.woff,.woff2,.otf,font/ttf,font/woff,font/woff2,font/otf"
                onChange={handleFileSelect}
                disabled={uploading}
                className="cursor-pointer"
              />
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected file: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* Custom Font Family Name */}
          <div className="space-y-2">
            <Label htmlFor="custom-font-family">Font Name *</Label>
            <Input
              id="custom-font-family"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              placeholder="e.g. My Custom Font"
              disabled={uploading}
            />
          </div>

          {/* Font Weights for Custom Fonts */}
          <div className="space-y-2">
            <Label>Font Weights (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Select the available weights for this font
            </p>
            <div className="flex flex-wrap gap-2">
              {FONT_WEIGHTS.map((weight) => (
                <div key={weight.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`custom-weight-${weight.value}`}
                    checked={selectedWeights.includes(weight.value)}
                    onCheckedChange={() => handleWeightToggle(weight.value)}
                    disabled={uploading}
                  />
                  <Label
                    htmlFor={`custom-weight-${weight.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {weight.label} ({weight.value})
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Font Category (optional) */}
      <div className="space-y-2">
        <Label htmlFor="font-category">Category (optional)</Label>
        <Select
          value={fontCategory}
          onValueChange={setFontCategory}
          disabled={uploading}
        >
          <SelectTrigger id="font-category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sans-serif">Sans-serif</SelectItem>
            <SelectItem value="serif">Serif</SelectItem>
            <SelectItem value="display">Display</SelectItem>
            <SelectItem value="handwriting">Handwriting</SelectItem>
            <SelectItem value="monospace">Monospace</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Is Primary */}
      <div className="flex items-center justify-between">
        <Label htmlFor="font-primary">Mark as Primary</Label>
        <input
          id="font-primary"
          type="checkbox"
          checked={isPrimary}
          onChange={(e) => setIsPrimary(e.target.checked)}
          disabled={uploading}
          className="h-4 w-4"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={handleCancel} disabled={uploading}>
          Cancel
        </Button>
        <Button
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
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Add Font
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
