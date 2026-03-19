import { Loader2 } from "lucide-react";

export function AdminShellSkeleton() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      aria-busy="true"
      aria-label="Loading dashboard shell"
    >
      <Loader2 className="size-6 animate-spin text-on-surface-variant" aria-hidden />
    </div>
  );
}
