"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ClientForm } from "../../components/client-form";
import { createClientAction } from "@/app/(studio)/admin/actions/clients";

export default function NewClientPage() {
  const router = useRouter();

  const handleSave = async (data: {
    ca_user_id: string;
    name: string;
    email: string;
    description?: string;
    is_active: boolean;
  }) => {
    const result = await createClientAction({
      ca_user_id: data.ca_user_id,
      name: data.name,
      email: data.email,
      description: data.description?.trim() || null,
      is_active: data.is_active,
    });
    if (result.error) throw new Error(result.error);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/clients")}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            New Client
          </h1>
          <p className="text-sm text-gray-500">
            Create a new client and associate its assets
          </p>
        </div>

        <ClientForm onSave={handleSave} />
      </div>
    </div>
  );
}
