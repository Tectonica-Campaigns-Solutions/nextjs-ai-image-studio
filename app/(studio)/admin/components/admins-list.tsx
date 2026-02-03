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
  LogOut,
  MoreVertical,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Admin } from "@/app/(studio)/admin/types";
import { deleteAdminAction } from "@/app/(studio)/admin/actions/admins";

interface AdminsListProps {
  initialAdmins: Admin[];
  currentUserId: string | null;
}

export function AdminsList({ initialAdmins, currentUserId }: AdminsListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (id: string, email: string) => {
    if (
      !confirm(
        `Are you sure you want to deactivate the admin ${email}? This action can be reversed by editing the admin.`
      )
    )
      return;
    const result = await deleteAdminAction(id);
    if (result.error) {
      setError(result.error);
      alert(result.error);
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

  const filteredAdmins = initialAdmins.filter((admin) =>
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">
              Admins
            </h1>
            <p className="text-sm text-gray-500">
              Manage the admins of the system
            </p>
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
              onClick={() => router.push("/admin/clients")}
              variant="outline"
              size="sm"
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Clients
            </Button>
            <Button
              onClick={() => router.push("/admin/admins/new")}
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Admin
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by email..."
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

        {filteredAdmins.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? "No admins found" : "No admins found"}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {searchTerm
                ? "Try with other search terms"
                : "Start creating your first admin"}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => router.push("/admin/admins/new")}
                className="bg-gray-900 text-white hover:bg-gray-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Admin
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
                  className="p-6 hover:shadow-lg transition-shadow border-gray-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {admin.email}
                        </h3>
                        {isCurrentUser && (
                          <span className="text-xs text-gray-500">(You)</span>
                        )}
                      </div>
                      {admin.granted_by_email && (
                        <p className="text-xs text-gray-500 mb-2">
                          Created by: {admin.granted_by_email}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={isCurrentUser}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/admins/${admin.id}`)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(admin.id, admin.email)}
                          className="text-red-600 focus:text-red-600"
                          disabled={isCurrentUser}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Status:</span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!admin.is_active
                          ? "bg-gray-100 text-gray-800"
                          : expired
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                          }`}
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
                        <span className="text-xs text-gray-500">Expires:</span>
                        <span className="text-xs text-gray-700">
                          {new Date(admin.expires_at).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
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
  );
}
