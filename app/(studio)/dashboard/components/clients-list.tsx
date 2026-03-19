"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MoreVertical,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
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
import type { Client } from "@/app/(studio)/dashboard/types";
import { deleteClientAction } from "@/app/(studio)/dashboard/actions/clients";
import { CreateClientModal } from "./create-client-modal";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active" | "inactive";
type SortKey = "created" | "name" | "updated";

const SORT_LABELS: Record<SortKey, string> = {
  created: "Created date",
  name: "Name",
  updated: "Last updated",
};

interface ClientsListProps {
  initialClients: Client[];
  totalClients: number;
  currentPage: number;
  pageSize: number;
}

export function ClientsList({
  initialClients,
  totalClients,
  currentPage,
  pageSize,
}: ClientsListProps) {
  const totalPages = Math.max(1, Math.ceil(totalClients / pageSize));
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchTerm = searchParams.get("q") ?? "";
  const statusFilter = (searchParams.get("status") ?? "all") as StatusFilter;
  const sortKey = (searchParams.get("sort") ?? "created") as SortKey;

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteClientAction(deleteTarget.id);
    if (result.error) {
      toast.error(result.error);
      setDeleteTarget(null);
      return;
    }
    toast.success("Client deleted");
    setDeleteTarget(null);
    router.refresh();
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParams({
          q: value.trim() || null,
          page: "1", // Reset to first page when search changes
        });
      }, 300);
    },
    [updateParams]
  );

  // Data is now filtered and sorted on the server - use initialClients directly
  const hasFilters = searchTerm || statusFilter !== "all";

  return (
    <>
      <CreateClientModal
        open={openCreateModal}
        onOpenChange={setOpenCreateModal}
      />
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client? This action cannot be
              undone.
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
      <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1 text-balance">
                Clients
              </h1>
              <p className="text-sm text-muted-foreground text-pretty">
                Manage your clients and their assets
              </p>
            </div>
            <Button onClick={() => setOpenCreateModal(true)}>
              <Plus className="size-4" aria-hidden />
              New client
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="relative max-w-md flex-1 w-full sm:w-auto">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Search clients…"
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
                aria-label="Search clients"
              />
            </div>

            <Tabs
              value={statusFilter}
              onValueChange={(v) =>
                updateParams({
                  status: v === "all" ? null : v,
                  page: "1",
                })
              }
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="inactive">Inactive</TabsTrigger>
              </TabsList>
            </Tabs>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ArrowUpDown className="size-3.5" aria-hidden />
                  {SORT_LABELS[sortKey]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() =>
                      updateParams({
                        sort: key === "created" ? null : key,
                        page: "1",
                      })
                    }
                    className={cn(sortKey === key && "font-semibold")}
                  >
                    {SORT_LABELS[key]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {initialClients.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto mb-4 flex size-24 items-center justify-center rounded-full bg-muted">
                <Plus className="size-10 text-muted-foreground" aria-hidden />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2 text-balance">
                {hasFilters ? "No clients found" : "No clients yet"}
              </h3>
              <p className="text-muted-foreground mb-6 text-sm text-pretty">
                {hasFilters
                  ? "Try adjusting your search or filters"
                  : "Start creating your first client"}
              </p>
              {!hasFilters && (
                <Button onClick={() => setOpenCreateModal(true)}>
                  <Plus className="size-4" aria-hidden />
                  New client
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {initialClients.map((client) => (
                <Card
                  key={client.id}
                  className="cursor-pointer p-6 transition-shadow hover:shadow-md"
                  onClick={() =>
                    router.push(`/dashboard/clients/${client.id}`)
                  }
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1 truncate text-lg font-semibold text-foreground">
                        {client.name}
                      </h3>
                      <p className="font-mono text-muted-foreground mb-3 text-xs tabular-nums">
                        {client.ca_user_id}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Open actions menu"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/clients/${client.id}`);
                          }}
                        >
                          <Edit className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({
                              id: client.id,
                              name: client.name,
                            });
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {client.description && (
                    <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">
                      {client.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between border-t pt-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        client.is_active
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {client.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {new Date(client.created_at!).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground tabular-nums">
                Showing{" "}
                {Math.min((currentPage - 1) * pageSize + 1, totalClients)}
                &ndash;
                {Math.min(currentPage * pageSize, totalClients)} of{" "}
                {totalClients}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() =>
                    updateParams({ page: String(currentPage - 1) })
                  }
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground tabular-nums px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    updateParams({ page: String(currentPage + 1) })
                  }
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          )}
      </div>
    </>
  );
}
