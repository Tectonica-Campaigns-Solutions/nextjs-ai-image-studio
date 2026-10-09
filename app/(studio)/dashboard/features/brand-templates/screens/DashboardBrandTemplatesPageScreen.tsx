"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DashboardPageHeader } from "@/app/(studio)/dashboard/components/dashboard-page-header";
import { DashboardEmptyState } from "@/app/(studio)/dashboard/components/dashboard-empty-state";
import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";
import { ConfirmDialog } from "@/app/(studio)/dashboard/components/confirm-dialog";
import { cx } from "@/app/(studio)/dashboard/utils/cx";
import { BRAND_FORMATS } from "@/lib/brand-templates/formats";
import type { BrandFormatKey } from "@/lib/brand-templates/types";
import type { BrandTemplateListItem } from "@/lib/brand-templates/server";
import {
  deleteBrandTemplateAction,
  setBrandTemplateActiveAction,
} from "../actions/brand-templates";
import { BrandTemplateFormDialog } from "../components/brand-template-form-dialog";

export function getTemplateAuthorUrl(templateId: string, format: BrandFormatKey): string {
  const params = new URLSearchParams({
    mode: "template-author",
    template_id: templateId,
    format,
  });
  return `/standalone/studio?${params.toString()}`;
}

export type DashboardBrandTemplatesPageScreenProps = Readonly<{
  templates: BrandTemplateListItem[];
  clients: Array<{ id: string; name: string }>;
}>;

export function DashboardBrandTemplatesPageScreen({
  templates,
  clients,
}: DashboardBrandTemplatesPageScreenProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BrandTemplateListItem | null>(null);
  const [deleting, setDeleting] = useState<BrandTemplateListItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const clientNames = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c.name])),
    [clients],
  );

  // Layouts are saved from the Studio in another tab; refresh when coming back.
  useEffect(() => {
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) =>
      `${t.name} ${t.category ?? ""} ${t.client_id ? clientNames[t.client_id] ?? "" : "global"}`
        .toLowerCase()
        .includes(q),
    );
  }, [clientNames, query, templates]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleToggleActive = async (template: BrandTemplateListItem, active: boolean) => {
    setTogglingId(template.id);
    const result = await setBrandTemplateActiveAction(template.id, active);
    setTogglingId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(active ? "Template activated" : "Template deactivated");
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const result = await deleteBrandTemplateAction(deleting.id);
    setDeleteBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Template deleted");
    setDeleting(null);
    router.refresh();
  };

  return (
    <main className="ml-0 pt-24 px-10 pb-12 min-h-screen bg-surface">
      <DashboardPageHeader
        segments={[{ label: "Dashboard", href: "/dashboard" }, { label: "Brand Templates" }]}
        title="Brand Templates"
        description="Template library for the Studio's Branding section. Global templates are available to every client."
        actions={
          <Button
            type="button"
            onClick={openCreate}
            className="gap-2 bg-dashboard-primary text-dashboard-on-primary hover:bg-dashboard-primary/90"
          >
            <DashboardMaterialIcon icon="add" className="text-lg" />
            New template
          </Button>
        }
      />

      <div className="my-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search templates..."
          className="h-10 w-full max-w-md rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 text-sm outline-none focus:border-dashboard-primary"
        />
      </div>

      {filtered.length === 0 ? (
        <DashboardEmptyState
          icon="dashboard_customize"
          title={templates.length === 0 ? "No templates yet" : "No matches"}
          description={
            templates.length === 0
              ? "Create a template, then design its layout for each social format."
              : "Try a different search."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((template) => {
            const savedFormats = new Set(template.formats.map((f) => f.format_key));
            const firstColor = template.variants.find((v) => v.kind === "color")?.value;
            return (
              <article
                key={template.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface-container-lowest"
              >
                <div
                  className="relative flex aspect-[4/3] items-center justify-center bg-surface-container-low"
                  style={firstColor && !template.thumbnail_url ? { backgroundColor: firstColor } : undefined}
                >
                  {template.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={template.thumbnail_url}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant/70">
                      No layout yet
                    </span>
                  )}
                  <span
                    className={cx(
                      "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold",
                      template.is_active
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-surface-container-high text-on-surface-variant",
                    )}
                  >
                    {template.is_active ? "Active" : "Draft"}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-on-surface">{template.name}</h3>
                      <p className="truncate text-xs text-on-surface-variant">
                        {template.client_id ? clientNames[template.client_id] ?? "Client" : "Global"}
                        {template.category ? ` · ${template.category}` : ""}
                      </p>
                    </div>
                    <Switch
                      aria-label="Active"
                      checked={template.is_active}
                      disabled={togglingId === template.id}
                      onCheckedChange={(checked) => void handleToggleActive(template, checked)}
                      className="data-[state=checked]:bg-dashboard-primary data-[state=unchecked]:bg-surface-container-high"
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Layouts
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {BRAND_FORMATS.map((format) => {
                        const saved = savedFormats.has(format.key);
                        return (
                          <a
                            key={format.key}
                            href={getTemplateAuthorUrl(template.id, format.key)}
                            target="_blank"
                            rel="noopener"
                            title={`${saved ? "Edit" : "Design"} ${format.label} (${format.width}×${format.height})`}
                            className={cx(
                              "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors",
                              saved
                                ? "border-dashboard-primary/30 bg-dashboard-primary/10 text-dashboard-primary hover:bg-dashboard-primary/15"
                                : "border-dashed border-outline-variant/30 text-on-surface-variant hover:border-dashboard-primary/40 hover:text-on-surface",
                            )}
                          >
                            <span>{format.ratio}</span>
                            <span className="text-[10px] font-medium opacity-80">
                              {saved ? "Edit" : "+ Design"}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {template.variants.length === 0 ? (
                      <span className="text-xs text-on-surface-variant">No background variants</span>
                    ) : (
                      template.variants.map((v) =>
                        v.kind === "color" ? (
                          <span
                            key={v.id}
                            title={v.label || v.value}
                            className="size-6 rounded-full border border-outline-variant/30"
                            style={{ backgroundColor: v.value }}
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={v.id}
                            src={v.value}
                            alt={v.label || "Image variant"}
                            title={v.label || "Image"}
                            className="size-6 rounded-full border border-outline-variant/30 object-cover"
                          />
                        ),
                      )
                    )}
                  </div>

                  <div className="mt-auto flex justify-end gap-2 border-t border-outline-variant/10 pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(template);
                        setFormOpen(true);
                      }}
                    >
                      Edit details
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleting(template)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <BrandTemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editing}
        clients={clients}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete template?"
        description={`"${deleting?.name ?? ""}" will be removed from the Studio. Designs users already saved are not affected.`}
        actionLabel="Delete"
        busyLabel="Deleting…"
        busy={deleteBusy}
        onConfirm={() => void handleDelete()}
        variant="destructive"
      />
    </main>
  );
}
