export default function ProjectDetailLoading() {
  return (
    <div className="space-y-6 antialiased animate-in fade-in duration-150">
      {/* Top Project Header Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-16 bg-blue-100/70 rounded-md animate-pulse" />
              <div className="h-7 w-64 bg-slate-200/80 rounded-lg animate-pulse" />
              <div className="h-6 w-24 bg-slate-100 rounded-full animate-pulse" />
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div className="h-4 w-36 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="h-10 w-28 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-10 w-32 bg-blue-100/60 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Tabs Bar Skeleton */}
        <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
          <div className="h-9 w-28 bg-slate-200/70 rounded-xl animate-pulse" />
          <div className="h-9 w-32 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-9 w-24 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-9 w-28 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Main Kanban / Stages Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((col) => (
          <div
            key={col}
            className="bg-slate-50/70 rounded-2xl border border-slate-200/70 p-4 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/50">
              <div className="h-4 w-28 bg-slate-200/80 rounded animate-pulse" />
              <div className="h-4 w-6 bg-slate-200 rounded animate-pulse" />
            </div>

            <div className="space-y-2.5">
              {[1, 2, 3].map((card) => (
                <div
                  key={card}
                  className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs space-y-2"
                >
                  <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                  <div className="flex items-center justify-between pt-1">
                    <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
                    <div className="w-5 h-5 rounded-full bg-slate-100 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
