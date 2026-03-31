export default function DashboardRouteLoading() {
  return (
    <div className="pt-24 px-10 pb-12 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-10 flex justify-between items-end">
        <div>
          <div className="h-4 w-32 bg-surface-container-low rounded mb-3" />
          <div className="h-9 w-64 bg-surface-container-low rounded" />
          <div className="h-4 w-96 bg-surface-container-low rounded mt-3" />
        </div>
        <div className="h-10 w-36 bg-surface-container-low rounded-xl" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-12 gap-6 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="col-span-12 md:col-span-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
            <div className="h-3 w-24 bg-surface-container-low rounded mb-3" />
            <div className="h-8 w-16 bg-surface-container-low rounded mb-2" />
            <div className="h-3 w-32 bg-surface-container-low rounded" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 bg-surface-container-low p-8 rounded-xl">
          <div className="h-5 w-32 bg-surface-container rounded mb-2" />
          <div className="h-3 w-48 bg-surface-container rounded mb-8" />
          <div className="h-64 bg-surface-container/50 rounded-lg" />
        </div>
        <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
          <div className="h-4 w-28 bg-surface-container-low rounded mb-6" />
          <div className="space-y-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-surface-container-low shrink-0" />
                <div className="flex-1">
                  <div className="h-4 w-full bg-surface-container-low rounded mb-1.5" />
                  <div className="h-3 w-20 bg-surface-container-low rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
