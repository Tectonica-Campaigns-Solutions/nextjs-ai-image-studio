import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ClientDetailLoading() {
  return (
    <div
      className={cn(
        "min-h-dvh bg-background flex items-center justify-center",
        "pb-[env(safe-area-inset-bottom)]"
      )}
      aria-busy="true"
      aria-label="Loading client"
    >
      <Loader2
        className="size-10 animate-spin text-muted-foreground"
        aria-hidden
      />
    </div>
  );
}
