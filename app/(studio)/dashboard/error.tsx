"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#f0f1f2] flex items-center justify-center p-6">
      <div className="w-full max-w-md p-8 bg-white rounded-3xl border-0 shadow-drop-shadow text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-[#3b4451] mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-[#929292] mb-6 [font-family:'Manrope',Helvetica]">
          An error occurred. Please try again.
        </p>
        <Button
          onClick={() => reset()}
          className="bg-[#5661f6] hover:bg-[#5661f6]/90 rounded-full [font-family:'Manrope',Helvetica] font-semibold"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}
