import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function AdminDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8" aria-busy="true" aria-label="Loading admin">
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="h-8 w-16" />
      </div>

      <div className="mb-8">
        <Skeleton className="h-7 w-36 mb-2" />
        <Skeleton className="h-4 w-56" />
      </div>

      <Card className="p-6 mb-6">
        <Skeleton className="h-6 w-28 mb-4" />
        <div className="space-y-3">
          <div>
            <Skeleton className="h-3 w-12 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div>
            <Skeleton className="h-3 w-12 mb-1" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div>
            <Skeleton className="h-3 w-24 mb-1" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="flex items-center justify-between border-t pt-6">
            <Skeleton className="h-9 w-36" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
