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
  LogOut,
  MoreVertical,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Client } from "@/app/(studio)/admin/types";
import { deleteClientAction } from "@/app/(studio)/admin/actions/clients";

interface ClientsListProps {
  initialClients: Client[];
}

export function ClientsList({ initialClients }: ClientsListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this client?")) return;
    const result = await deleteClientAction(id);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    router.refresh();
  };

  const handleLogout = async () => {
    const supabase = createClient();
    const { error: err } = await supabase.auth.signOut();
    if (err) {
      setError("Error closing session");
      return;
    }
    router.push("/admin/login");
  };

  const filteredClients = initialClients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.ca_user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Clients</h1>
            <p className="text-sm text-gray-500">Manage your clients and their assets</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
            <Button
              onClick={() => router.push("/admin/admins")}
              variant="outline"
              size="sm"
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Admins List
            </Button>
            <Button
              onClick={() => router.push("/admin/clients/new")}
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Client
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-gray-200 focus:border-gray-400 focus:ring-gray-400"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {filteredClients.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Plus className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? "No clients found" : "No clients found"}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {searchTerm
                ? "Try with other search terms"
                : "Start creating your first client"}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => router.push("/admin/clients/new")}
                className="bg-gray-900 text-white hover:bg-gray-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Client
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <Card
                key={client.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-gray-200"
                onClick={() => router.push(`/admin/clients/${client.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                      {client.name}
                    </h3>
                    <p className="text-xs font-mono text-gray-500 mb-3">
                      {client.ca_user_id}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/clients/${client.id}`);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/clients/${client.id}`);
                        }}
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        View Assets
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(client.id);
                        }}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {client.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {client.description}
                  </p>
                )}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${client.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}
                  >
                    {client.is_active ? "Active" : "Inactive"}
                  </span>
                  <span className="text-xs text-gray-500">
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
  );
}
