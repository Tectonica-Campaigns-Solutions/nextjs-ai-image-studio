import { Loader2 } from "lucide-react";

export default function AdminDetailLoading() {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center"
      aria-busy="true"
      aria-label="Loading admin"
    >
      <Loader2 className="size-6 animate-spin text-on-surface-variant" aria-hidden />
    </div>
  );
}
