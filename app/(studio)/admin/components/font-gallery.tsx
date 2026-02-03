"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Star } from "lucide-react";
import { FontUpload } from "./font-upload";
import type { ClientFont } from "@/app/(studio)/admin/types";
import { deleteFontAction, setPrimaryFontAction } from "@/app/(studio)/admin/actions/fonts";

interface FontGalleryProps {
  clientId: string;
  fonts: ClientFont[];
  onRefresh: () => void;
}

export function FontGallery({
  clientId,
  fonts,
  onRefresh,
}: FontGalleryProps) {
  const [showUpload, setShowUpload] = useState(false);

  const handleDelete = async (fontId: string) => {
    if (!confirm("Are you sure you want to delete this font?")) return;
    const result = await deleteFontAction(clientId, fontId);
    if (result.error) {
      alert(result.error);
      return;
    }
    onRefresh();
  };

  const handleSetPrimary = async (fontId: string) => {
    const result = await setPrimaryFontAction(clientId, fontId);
    if (result.error) {
      alert(result.error);
      return;
    }
    onRefresh();
  };

  if (showUpload) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add New Font</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUpload(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <FontUpload
          clientId={clientId}
          onUploadComplete={() => {
            setShowUpload(false);
            onRefresh();
          }}
          onCancel={() => setShowUpload(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {fonts.length} font{fonts.length !== 1 ? "s" : ""} registered
            {fonts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)} size="sm">
          Add Font
        </Button>
      </div>

      {fonts.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">
            No fonts found. Add the first one to start.
          </p>
          <Button onClick={() => setShowUpload(true)} variant="outline">
            Add Font
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fonts.map((font) => (
            <div
              key={font.id}
              className="relative group border rounded-lg overflow-hidden bg-card p-4"
            >
              {/* Font Preview */}
              <div className="mb-3">
                <div
                  className="text-2xl font-semibold mb-2"
                  style={{
                    fontFamily: font.font_family,
                  }}
                >
                  {font.font_family}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="px-2 py-1 bg-muted rounded">
                    {font.font_source === "google" ? "Google Fonts" : "Custom"}
                  </span>
                  {font.font_category && (
                    <span className="px-2 py-1 bg-muted rounded">
                      {font.font_category}
                    </span>
                  )}
                </div>
              </div>

              {/* Font Weights */}
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">Weights:</p>
                <div className="flex flex-wrap gap-1">
                  {font.font_weights.map((weight) => (
                    <span
                      key={weight}
                      className="text-xs px-2 py-1 bg-muted rounded"
                    >
                      {weight}
                    </span>
                  ))}
                </div>
              </div>

              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSetPrimary(font.id)}
                  disabled={font.is_primary}
                  title={font.is_primary ? "Already primary" : "Mark as Primary"}
                >
                  <Star
                    className={`h-4 w-4 ${font.is_primary ? "fill-yellow-400 text-yellow-400" : "fill-gray-400 text-gray-400"
                      }`}
                  />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(font.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Primary badge */}
              {font.is_primary && (
                <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  Primary
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
