"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

interface ClientFormProps {
  clientId?: string;
  initialData?: {
    ca_user_id?: string;
    name?: string;
    email?: string;
    description?: string;
    is_active?: boolean;
  };
  onSave: (data: {
    ca_user_id: string;
    name: string;
    email: string;
    description?: string;
    is_active: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
}

export function ClientForm({
  clientId,
  initialData,
  onSave,
  onCancel,
}: ClientFormProps) {
  const [caUserId, setCaUserId] = useState(initialData?.ca_user_id || "");
  const [name, setName] = useState(initialData?.name || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [isActive, setIsActive] = useState(
    initialData?.is_active !== undefined ? initialData.is_active : true
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!caUserId.trim()) {
      setError("CA User ID is required");
      return;
    }

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Email is not valid");
      return;
    }

    try {
      setSaving(true);
      await onSave({
        ca_user_id: caUserId.trim(),
        name: name.trim(),
        email: email.trim(),
        description: description.trim() || undefined,
        is_active: isActive,
      });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Error saving client"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="ca_user_id" className="text-sm font-medium text-gray-700">
            CA User ID <span className="text-red-500">*</span>
          </Label>
          <Input
            id="ca_user_id"
            value={caUserId}
            onChange={(e) => setCaUserId(e.target.value)}
            placeholder="ID of the user in Change Agent"
            disabled={!!clientId}
            className={`border-gray-200 focus:border-gray-400 focus:ring-gray-400 ${clientId ? "bg-gray-50 text-gray-500" : ""
              }`}
          />
          {clientId && (
            <p className="text-xs text-gray-500 mt-1">
              The CA User ID cannot be modified
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-gray-700">
            Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name of the client"
            required
            className="border-gray-200 focus:border-gray-400 focus:ring-gray-400"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            required
            className="border-gray-200 focus:border-gray-400 focus:ring-gray-400"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium text-gray-700">
            Description
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description of the client (optional)"
            rows={4}
            className="border-gray-200 focus:border-gray-400 focus:ring-gray-400 resize-none"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <Label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">
              Active Status
            </Label>
            <p className="text-xs text-gray-500 mt-1">
              The client will be available to use its assets and fonts
            </p>
          </div>
          <Switch
            id="is_active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={saving}
            className="bg-gray-900 text-white hover:bg-gray-800 min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
