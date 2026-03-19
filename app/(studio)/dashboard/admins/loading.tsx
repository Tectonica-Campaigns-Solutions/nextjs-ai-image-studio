import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function AdminsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8" aria-busy="true" aria-label="Loading admins">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton className="h-7 w-24 mb-2" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="mb-6">
        <Skeleton className="h-9 w-full max-w-md" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-3 w-48 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="size-8 rounded" />
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
            <div className="pt-4 border-t">
              <Skeleton className="h-3 w-28" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
