import { Loader2 } from "lucide-react";

export default function AdminLoading() {
  return (
    <div
      className="min-h-[100vh] flex items-center justify-center"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <Loader2 className="size-6 animate-spin text-on-surface-variant" aria-hidden />
    </div>
  );
}
