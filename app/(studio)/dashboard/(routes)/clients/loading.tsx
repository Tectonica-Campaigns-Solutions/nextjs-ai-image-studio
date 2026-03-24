export default function ClientsLoading() {
  return (
    <div className="pt-16 px-10 min-h-screen bg-surface animate-pulse">
      <div className="w-full py-10 space-y-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="h-4 w-24 bg-surface-container-low rounded mb-3" />
            <div className="h-9 w-48 bg-surface-container-low rounded" />
          </div>
          <div className="h-10 w-36 bg-surface-container-low rounded-xl" />
        </div>

        <div className="grid grid-cols-4 gap-6 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest p-5 rounded-xl shadow-sm">
              <div className="h-3 w-20 bg-surface-container-low rounded mb-3" />
              <div className="h-7 w-12 bg-surface-container-low rounded mb-1" />
              <div className="h-3 w-10 bg-surface-container-low rounded" />
            </div>
          ))}
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10">
          <div className="px-6 py-4 border-b border-surface-container">
            <div className="h-8 w-48 bg-surface-container-low rounded" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4 border-b border-surface-container/50">
              <div className="w-9 h-9 rounded-lg bg-surface-container-low" />
              <div className="flex-1">
                <div className="h-4 w-40 bg-surface-container-low rounded mb-1.5" />
                <div className="h-3 w-24 bg-surface-container-low rounded" />
              </div>
              <div className="h-5 w-16 bg-surface-container-low rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
