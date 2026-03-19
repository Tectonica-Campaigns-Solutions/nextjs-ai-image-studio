"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { X, Star, Type } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FontUpload } from "./font-upload";
import type { ClientFont } from "@/app/(studio)/dashboard/types";
import { deleteFontAction, setPrimaryFontAction } from "@/app/(studio)/dashboard/actions/fonts";

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
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteFontAction(clientId, deleteTarget);
    if (result.error) {
      toast.error(result.error);
      setDeleteTarget(null);
      return;
    }
    toast.success("Font deleted");
    setDeleteTarget(null);
    onRefresh();
  };

  const handleSetPrimary = async (fontId: string) => {
    const result = await setPrimaryFontAction(clientId, fontId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Primary font updated");
    onRefresh();
  };

  return (
    <>
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto" showCloseButton>
          <DialogHeader>
            <DialogTitle>Add font</DialogTitle>
            <DialogDescription>
              Add a font from Google Fonts or upload a custom font file (TTF, WOFF, WOFF2, OTF).
            </DialogDescription>
          </DialogHeader>
          <FontUpload
            clientId={clientId}
            onUploadComplete={() => {
              setShowUpload(false);
              onRefresh();
            }}
            onCancel={() => setShowUpload(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete font</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this font? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {fonts.length} font{fonts.length !== 1 ? "s" : ""} registered
            </p>
          </div>
          <Button onClick={() => setShowUpload(true)} size="sm" aria-label="Add new font">
            Add font
          </Button>
        </div>

        {fonts.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Type className="size-8 text-muted-foreground mx-auto mb-3" aria-hidden />
            <p className="text-sm text-muted-foreground mb-4 text-pretty">
              No fonts found. Add the first one to start.
            </p>
            <Button onClick={() => setShowUpload(true)} variant="outline" aria-label="Add first font">
              Add font
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fonts.map((font) => (
              <div
                key={font.id}
                className="relative group border rounded-lg overflow-hidden bg-card p-4"
              >
                <div className="mb-3">
                  <div
                    className="text-2xl font-semibold mb-2 truncate"
                    style={{ fontFamily: font.font_family }}
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

                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Weights:</p>
                  <div className="flex flex-wrap gap-1">
                    {font.font_weights.map((weight) => (
                      <span
                        key={weight}
                        className="text-xs px-2 py-1 bg-muted rounded tabular-nums"
                      >
                        {weight}
                      </span>
                    ))}
                  </div>
                </div>

                {font.is_primary && (
                  <div className="absolute top-2 right-2 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                    <Star className="size-3 fill-current" />
                    Primary
                  </div>
                )}

                <div className="flex items-center gap-1 pt-3 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetPrimary(font.id)}
                    disabled={font.is_primary}
                    title={font.is_primary ? "Already primary" : "Mark as Primary"}
                    aria-label={font.is_primary ? "Already primary" : "Mark as Primary"}
                  >
                    <Star
                      className={`size-3.5 ${font.is_primary ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                    />
                    {font.is_primary ? "Primary" : "Set primary"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(font.id)}
                    aria-label="Delete font"
                  >
                    <X className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
