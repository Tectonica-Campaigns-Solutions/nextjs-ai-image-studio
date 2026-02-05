"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MoreVertical,
  Shield,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { Admin } from "@/app/(studio)/dashboard/types";
import { deleteAdminAction } from "@/app/(studio)/dashboard/actions/admins";
import { CreateAdminModal } from "./create-admin-modal";
import { cn } from "@/lib/utils";

interface AdminsListProps {
  initialAdmins: Admin[];
  currentUserId: string | null;
}

export function AdminsList({ initialAdmins, currentUserId }: AdminsListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; email: string } | null>(null);

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    const result = await deleteAdminAction(deactivateTarget.id);
    if (result.error) {
      setError(result.error);
      setDeactivateTarget(null);
      return;
    }
    setError(null);
    setDeactivateTarget(null);
    router.refresh();
  };

  const filteredAdmins = initialAdmins.filter((admin) =>
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <>
      <CreateAdminModal open={openCreateModal} onOpenChange={setOpenCreateModal} />
      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this admin? This action can be reversed by editing the admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className={cn("min-h-dvh bg-background")}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1 text-balance">
                Admins
              </h1>
              <p className="text-sm text-muted-foreground text-pretty">
                Manage the admins of the system
              </p>
            </div>
            <Button onClick={() => setOpenCreateModal(true)}>
              <Plus className="size-4" aria-hidden />
              New admin
            </Button>
          </div>

          <div className="mb-6">
            <div className="relative max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Search by email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                aria-label="Search admins by email"
              />
            </div>
          </div>

          {error && (
            <div
              className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </div>
          )}

          {filteredAdmins.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto mb-4 flex size-24 items-center justify-center rounded-full bg-muted">
                <Shield className="size-10 text-muted-foreground" aria-hidden />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2 text-balance">
                {searchTerm ? "No admins found" : "No admins found"}
              </h3>
              <p className="text-muted-foreground mb-6 text-sm text-pretty">
                {searchTerm
                  ? "Try with other search terms"
                  : "Start creating your first admin"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setOpenCreateModal(true)}>
                  <Plus className="size-4" aria-hidden />
                  New admin
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAdmins.map((admin) => {
                const isCurrentUser = admin.user_id === currentUserId;
                const expired = isExpired(admin.expires_at);
                return (
                  <Card
                    key={admin.id}
                    className="p-6 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="truncate text-lg font-semibold text-foreground">
                            {admin.email && admin.email !== "N/A"
                              ? admin.email
                              : "Email not available"}
                          </h3>
                          {isCurrentUser && (
                            <span className="text-muted-foreground text-xs">(You)</span>
                          )}
                        </div>
                        {admin.granted_by_email && (
                          <p className="text-muted-foreground mb-2 text-xs">
                            Created by: {admin.granted_by_email}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            disabled={isCurrentUser}
                            aria-label="Open actions menu"
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/dashboard/admins/${admin.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeactivateTarget({ id: admin.id, email: admin.email })}
                            className="text-destructive focus:text-destructive"
                            disabled={isCurrentUser}
                          >
                            <Trash2 className="size-4" />
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mb-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">Status:</span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            !admin.is_active && "bg-muted text-muted-foreground",
                            admin.is_active && expired && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
                            admin.is_active && !expired && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                          )}
                        >
                          {!admin.is_active
                            ? "Inactive"
                            : expired
                              ? "Expired"
                              : "Active"}
                        </span>
                      </div>
                      {admin.expires_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-xs">Expires:</span>
                          <span className="tabular-nums text-xs">
                            {new Date(admin.expires_at).toLocaleDateString("es-ES", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="pt-4 border-t border-border">
                      <span className="text-muted-foreground text-xs tabular-nums">
                        Created:{" "}
                        {new Date(admin.granted_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
