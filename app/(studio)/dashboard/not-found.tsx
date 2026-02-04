import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function AdminNotFound() {
  return (
    <div className="min-h-screen bg-[#f0f1f2] flex items-center justify-center p-6">
      <div className="w-full max-w-md p-8 bg-white rounded-3xl border-0 shadow-drop-shadow text-center">
        <FileQuestion className="w-12 h-12 text-[#929292] mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-[#3b4451] mb-2">
          Resource not found
        </h2>
        <p className="text-sm text-[#929292] mb-6 [font-family:'Manrope',Helvetica]">
          The requested resource could not be found.
        </p>
        <Button
          asChild
          className="bg-[#5661f6] hover:bg-[#5661f6]/90 rounded-full [font-family:'Manrope',Helvetica] font-semibold"
        >
          <Link href="/dashboard/clients">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
