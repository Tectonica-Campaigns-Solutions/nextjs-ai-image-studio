"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Plan } from "@/app/(studio)/dashboard/utils/types";
import { DashboardPageHeader } from "@/app/(studio)/dashboard/components/dashboard-page-header";
import { DashboardEntityTable } from "@/app/(studio)/dashboard/components/dashboard-entity-table";
import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";
import { ConfirmDialog } from "@/app/(studio)/dashboard/components/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlanForm } from "@/app/(studio)/dashboard/features/plans/components/PlanForm";
import {
  createPlanAction,
  deletePlanAction,
  updatePlanAction,
} from "@/app/(studio)/dashboard/features/plans/actions/plans";

export function DashboardPlansScreen(props: { plans: Plan[] }) {
  const router = useRouter();
  const plans = props.plans ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [deletePlan, setDeletePlan] = useState<Plan | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => plans, [plans]);

  return (
    <div className="pt-16 px-10 min-h-screen bg-surface">
      <div className="w-full py-10 space-y-8">
        <DashboardPageHeader
          segments={[{ label: "Plans" }]}
          title="Plans"
          actions={
            <button
              className="bg-gradient-to-br from-dashboard-primary to-dashboard-primary-dim text-dashboard-on-primary px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-dashboard-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              onClick={() => setCreateOpen(true)}
            >
              <DashboardMaterialIcon icon="add" className="text-sm" />
              Create Plan
            </button>
          }
        />

        <DashboardEntityTable
          toolbarLeft={<></>}
          showingLabel={`Showing ${rows.length} plan${rows.length === 1 ? "" : "s"}`}
          isEmpty={rows.length === 0}
          selectedIds={[]}
          bulkActions={[]}
          header={
            <tr className="bg-surface-container-low">
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                Name
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                Code
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">
                Images limit
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">
                Actions
              </th>
            </tr>
          }
          body={
            <>
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-surface-container-highest transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-on-surface">
                    {p.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">
                    <span className="font-mono">{p.code}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-on-surface text-right">
                    {p.images_limit === 0 ? "Unlimited" : p.images_limit.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditPlan(p)}
                        className="px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/10 text-on-surface-variant text-xs font-semibold hover:bg-surface-container-high"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setDeleteError(null);
                          setDeletePlan(p);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-error-container text-on-error-container text-xs font-semibold hover:opacity-90 disabled:opacity-60 border border-error/10"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </>
          }
          emptyState={
            <div className="py-0 px-4 text-sm text-on-surface-variant text-center">
              No plans found. Create one to start assigning it to clients.
            </div>
          }
          page={1}
          totalPages={1}
          onPageChange={() => { }}
        />
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          className="sm:max-w-lg bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant/10 rounded-2xl shadow-sm shadow-on-surface/5 max-h-[90dvh] overflow-y-auto"
          showCloseButton
        >
          <DialogHeader className="mb-4 pb-4 border-b border-outline-variant/10">
            <DialogTitle className="text-2xl font-extrabold tracking-tight text-on-surface">
              New Plan
            </DialogTitle>
            <DialogDescription className="text-on-surface-variant">
              Create a plan with an image limit (0 = unlimited).
            </DialogDescription>
          </DialogHeader>

          <PlanForm
            saving={busy}
            onCancel={() => setCreateOpen(false)}
            onSave={async (data) => {
              setBusy(true);
              try {
                const res = await createPlanAction(data);
                if (res.error) throw new Error(res.error);
                toast.success("Plan created");
                setCreateOpen(false);
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to create plan");
              } finally {
                setBusy(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editPlan} onOpenChange={(open) => !open && setEditPlan(null)}>
        <DialogContent
          className="sm:max-w-lg bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant/10 rounded-2xl shadow-sm shadow-on-surface/5 max-h-[90dvh] overflow-y-auto"
          showCloseButton
        >
          <DialogHeader className="mb-4 pb-4 border-b border-outline-variant/10">
            <DialogTitle className="text-2xl font-extrabold tracking-tight text-on-surface">
              Edit Plan
            </DialogTitle>
            <DialogDescription className="text-on-surface-variant">
              Update plan settings.
            </DialogDescription>
          </DialogHeader>

          {editPlan ? (
            <PlanForm
              saving={busy}
              initialData={{
                code: editPlan.code,
                name: editPlan.name,
                images_limit: editPlan.images_limit,
              }}
              onCancel={() => setEditPlan(null)}
              onSave={async (data) => {
                setBusy(true);
                try {
                  const res = await updatePlanAction(editPlan.id, data);
                  if (res.error) throw new Error(res.error);
                  toast.success("Plan updated");
                  setEditPlan(null);
                  router.refresh();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed to update plan");
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletePlan}
        onOpenChange={(open) => {
          if (!open) {
            setDeletePlan(null);
            setDeleteBusy(false);
            setDeleteError(null);
          }
        }}
        title="Delete plan"
        description={
          deletePlan
            ? `Delete "${deletePlan.name}"? This will remove the plan from selection lists. Existing clients may still reference it until updated.`
            : "Delete this plan?"
        }
        actionLabel="Delete"
        busyLabel="Deleting..."
        busy={deleteBusy}
        errorMessage={deleteError}
        onConfirm={() => {
          if (!deletePlan) return;
          (async () => {
            setDeleteBusy(true);
            setDeleteError(null);
            try {
              const res = await deletePlanAction(deletePlan.id);
              if (res.error) throw new Error(res.error);
              toast.success("Plan deleted");
              setDeletePlan(null);
              router.refresh();
            } catch (e) {
              setDeleteError(e instanceof Error ? e.message : "Failed to delete plan");
              setDeleteBusy(false);
            }
          })();
        }}
      />
    </div>
  );
}

