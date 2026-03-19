import { Loader2 } from "lucide-react";

export function ClientDetailGalleriesSkeleton() {
  return (
    <div
      className="min-h-[40vh] flex items-center justify-center"
      aria-busy="true"
      aria-label="Loading client galleries"
    >
      <Loader2 className="size-6 animate-spin text-on-surface-variant" aria-hidden />
    </div>
  );
}
