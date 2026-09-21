export default function AppLoading() {
  return (
    <div className="space-y-6 antialiased animate-in fade-in duration-150">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200/80 rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-slate-100 rounded-md animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-28 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-10 w-36 bg-blue-100/60 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* 4 Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
              <div className="w-14 h-4 rounded bg-slate-100 animate-pulse" />
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="h-7 w-20 bg-slate-200/80 rounded-lg animate-pulse" />
              <div className="h-3.5 w-32 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Filter & Search Bar Skeleton */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="h-10 w-full sm:max-w-md bg-slate-100 rounded-xl animate-pulse" />
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="h-10 w-24 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-10 w-24 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Main Content / Table / List Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
        <div className="h-5 w-40 bg-slate-200/80 rounded-md animate-pulse mb-6" />

        {[1, 2, 3, 4, 5].map((row) => (
          <div
            key={row}
            className="flex items-center justify-between py-3.5 border-b border-slate-100 last:border-0 gap-4"
          >
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-100 shrink-0 animate-pulse" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="h-4 w-44 bg-slate-200/70 rounded animate-pulse" />
                <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-6">
              <div className="h-6 w-20 bg-slate-100 rounded-full animate-pulse" />
              <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
              <div className="h-8 w-8 rounded-lg bg-slate-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
