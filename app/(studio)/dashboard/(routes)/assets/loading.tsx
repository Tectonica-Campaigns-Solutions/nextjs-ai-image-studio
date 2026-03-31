export default function AssetsLoading() {
  return (
    <div className="pt-16 px-10 min-h-screen bg-surface animate-pulse">
      <div className="w-full py-10 space-y-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="h-4 w-24 bg-surface-container-low rounded mb-3" />
            <div className="h-9 w-40 bg-surface-container-low rounded" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
              <div className="aspect-square bg-surface-container-low" />
              <div className="p-3">
                <div className="h-4 w-28 bg-surface-container-low rounded mb-1" />
                <div className="h-3 w-20 bg-surface-container-low rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
