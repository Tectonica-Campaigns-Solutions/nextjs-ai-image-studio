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
  Image as ImageIcon,
  MoreVertical,
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

interface ClientsListProps {
  initialClients: Client[];
}

export function ClientsList({ initialClients }: ClientsListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteClientAction(deleteTarget.id);
    if (result.error) {
      setError(result.error);
      setDeleteTarget(null);
      return;
    }
    setError(null);
    setDeleteTarget(null);
    router.refresh();
  };

  const filteredClients = initialClients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.ca_user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <CreateClientModal open={openCreateModal} onOpenChange={setOpenCreateModal} />
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client? This action cannot be undone.
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
      <div className={cn("min-h-dvh bg-background")}>
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

          <div className="mb-6">
            <div className="relative max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Search clients…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                aria-label="Search clients"
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

          {filteredClients.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto mb-4 flex size-24 items-center justify-center rounded-full bg-muted">
                <Plus className="size-10 text-muted-foreground" aria-hidden />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2 text-balance">
                {searchTerm ? "No clients found" : "No clients found"}
              </h3>
              <p className="text-muted-foreground mb-6 text-sm text-pretty">
                {searchTerm
                  ? "Try with other search terms"
                  : "Start creating your first client"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setOpenCreateModal(true)}>
                  <Plus className="size-4" aria-hidden />
                  New client
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((client) => (
                <Card
                  key={client.id}
                  className="cursor-pointer p-6 transition-shadow hover:shadow-md"
                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
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
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/clients/${client.id}`);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/clients/${client.id}`);
                          }}
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          View Assets
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ id: client.id, name: client.name });
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
                        client.is_active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {client.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {new Date(client.created_at!).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
