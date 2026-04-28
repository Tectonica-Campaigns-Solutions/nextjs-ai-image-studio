"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FontUpload } from "./font-upload";
import { FontCard } from "./font-card";
import type { ClientFont, FontWeight } from "@/app/(studio)/dashboard/utils/types";
import { useFontLoader } from "@/app/(studio)/dashboard/hooks/use-font-loader";
import {
  deleteFontAction,
  setBrandFontAction,
  setPrimaryFontAction,
  updateFontAction,
} from "@/app/(studio)/dashboard/features/frames-fonts/actions/fonts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FONT_WEIGHTS } from "@/app/(studio)/standalone/studio/utils/studio-utils";
import { ConfirmDialog } from "@/app/(studio)/dashboard/components/confirm-dialog";
import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";

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
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editFamily, setEditFamily] = useState("");
  const [editCategory, setEditCategory] = useState<string>("");
  const [editWeights, setEditWeights] = useState<FontWeight[]>([]);
  const [editError, setEditError] = useState<string | null>(null);

  useFontLoader(fonts);

  const editTarget = useMemo(
    () => fonts.find((f) => f.id === editTargetId) ?? null,
    [fonts, editTargetId]
  );

  const closeEdit = () => {
    setEditTargetId(null);
    setEditSaving(false);
    setEditError(null);
    setEditFamily("");
    setEditCategory("");
    setEditWeights([]);
  };

  const openEdit = (fontId: string) => {
    const f = fonts.find((x) => x.id === fontId);
    if (!f) return;
    setEditTargetId(fontId);
    setEditSaving(false);
    setEditError(null);
    setEditFamily(f.font_family);
    setEditCategory(f.font_category ?? "");
    setEditWeights(f.font_weights ?? []);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);
    const result = await deleteFontAction(clientId, deleteTarget);
    if (result.error) {
      setDeleteError(result.error);
      setDeleteBusy(false);
      return;
    }
    toast.success("Font deleted");
    setDeleteBusy(false);
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

  const handleToggleBrand = async (font: ClientFont) => {
    const next = !font.is_brand;
    const result = await setBrandFontAction(clientId, font.id, next);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(next ? "Marked as brand font" : "Removed from brand fonts");
    onRefresh();
  };

  return (
    <>
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent
          className="sm:max-w-lg bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant/10 rounded-2xl shadow-sm shadow-on-surface/5 max-h-[90dvh] overflow-y-auto"
          showCloseButton
        >
          <DialogHeader className="mb-4 pb-4 border-b border-outline-variant/10">
            <DialogTitle className="text-2xl font-extrabold tracking-tight text-on-surface">
              Add font
            </DialogTitle>
            <DialogDescription className="text-on-surface-variant">
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

      <Dialog
        open={!!editTargetId}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
      >
        <DialogContent
          className="sm:max-w-lg bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant/10 rounded-2xl shadow-sm shadow-on-surface/5 max-h-[90dvh] overflow-y-auto"
          showCloseButton
        >
          <DialogHeader className="mb-4 pb-4 border-b border-outline-variant/10">
            <DialogTitle className="text-2xl font-extrabold tracking-tight text-on-surface">
              Edit font
            </DialogTitle>
            <DialogDescription className="text-on-surface-variant">
              Update font family, category and available weights.
            </DialogDescription>
          </DialogHeader>

          {editTarget ? (
            <div className="space-y-5">
              {editError && (
                <div className="rounded-xl border border-error/20 bg-error/10 p-3 text-sm text-error" role="alert">
                  {editError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-font-family">
                  Font family <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-font-family"
                  value={editFamily}
                  onChange={(e) => setEditFamily(e.target.value)}
                  disabled={editSaving}
                  className="dashboard-input !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 shadow-none focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-font-category">Category (optional)</Label>
                <Input
                  id="edit-font-category"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  disabled={editSaving}
                  placeholder="e.g. sans-serif"
                  className="dashboard-input !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 shadow-none focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
                />
              </div>

              <div className="space-y-2">
                <Label>Weights</Label>
                <div className="flex flex-wrap gap-2">
                  {FONT_WEIGHTS.map((w) => (
                    <div key={w.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-weight-${w.value}`}
                        checked={editWeights.includes(w.value as FontWeight)}
                        onCheckedChange={(checked) => {
                          const isChecked = Boolean(checked);
                          setEditWeights((prev) => {
                            if (isChecked) return Array.from(new Set([...prev, w.value as FontWeight]));
                            return prev.filter((x) => x !== w.value);
                          });
                        }}
                        disabled={editSaving}
                      />
                      <Label
                        htmlFor={`edit-weight-${w.value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {w.label} ({w.value})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEdit}
                  disabled={editSaving}
                  className="bg-surface-container-lowest border-outline-variant/10 hover:bg-surface-container-high"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    if (!editTarget) return;
                    setEditSaving(true);
                    setEditError(null);
                    try {
                      const result = await updateFontAction(clientId, editTarget.id, {
                        font_family: editFamily,
                        font_category: editCategory.trim() ? editCategory : null,
                        font_weights: editWeights,
                      });
                      if (result.error) {
                        setEditError(result.error);
                        return;
                      }
                      toast.success("Font updated");
                      closeEdit();
                      onRefresh();
                    } finally {
                      setEditSaving(false);
                    }
                  }}
                  disabled={
                    editSaving ||
                    editFamily.trim().length === 0 ||
                    editWeights.length === 0
                  }
                  className="min-w-[140px] gap-2 bg-dashboard-primary text-dashboard-on-primary border border-dashboard-primary/10 hover:opacity-90 shadow-sm shadow-dashboard-primary/20 disabled:opacity-70"
                >
                  {editSaving ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="size-4" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteBusy(false);
            setDeleteError(null);
          }
        }}
        title="Delete font"
        description="Are you sure you want to delete this font? This action cannot be undone."
        actionLabel="Delete"
        busy={deleteBusy}
        busyLabel="Deleting..."
        errorMessage={deleteError}
        onConfirm={handleConfirmDelete}
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fonts.map((font) => (
            <FontCard
              key={font.id}
              font={font}
              onEdit={() => openEdit(font.id)}
              onSetPrimary={() => void handleSetPrimary(font.id)}
              onToggleBrand={() => void handleToggleBrand(font)}
              onDelete={() => setDeleteTarget(font.id)}
            />
          ))}

          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="group relative aspect-square rounded-xl bg-surface-container-low overflow-hidden cursor-pointer border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-high transition-colors"
            aria-label="Add new font"
          >
            <DashboardMaterialIcon icon="add_circle" className="text-dashboard-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Upload Font
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
