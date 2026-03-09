import { Skeleton } from "@/components/ui/skeleton";

export function ClientDetailGalleriesSkeleton() {
  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="grid grid-cols-2 gap-4" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
        <Skeleton className="h-6 w-28 mb-2" />
        <Skeleton className="h-4 w-full max-w-xl mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
        <Skeleton className="h-6 w-28 mb-6" />
        <div className="flex flex-wrap gap-3" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-md" />
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <Skeleton className="h-6 w-36 mb-2" />
        <Skeleton className="h-4 w-full max-w-2xl mb-6" />
        <div className="space-y-4" aria-hidden>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 border rounded-lg">
              <Skeleton className="h-16 w-24 shrink-0 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
