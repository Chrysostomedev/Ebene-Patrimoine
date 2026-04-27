/**
 * app/admin/loading.tsx
 *
 * S'applique uniquement au segment /admin.
 */

export default function AdminLoading() {
    return (
      <div className="flex min-h-screen bg-gray-50 font-sans">
  
        {/* ── Sidebar skeleton ── */}
        <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-100 z-20 flex flex-col px-5 py-6 gap-6">
          <div className="flex items-center gap-3 px-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-slate-100 animate-pulse" />
            <div className="w-24 h-4 bg-slate-100 rounded-lg animate-pulse" />
          </div>
  
          <div className="flex flex-col gap-2 mt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ opacity: 1 - i * 0.08 }}
              >
                <div className="w-5 h-5 rounded-lg bg-slate-100 animate-pulse shrink-0" />
                <div
                  className="h-3.5 bg-slate-100 rounded-lg animate-pulse"
                  style={{ width: `${65 - i * 4}%` }}
                />
              </div>
            ))}
          </div>
  
          <div className="mt-auto flex items-center gap-3 px-2 pt-4 border-t border-slate-50">
            <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="w-3/4 h-3 bg-slate-100 rounded animate-pulse" />
              <div className="w-1/2 h-2.5 bg-slate-50 rounded animate-pulse" />
            </div>
          </div>
        </aside>
  
        {/* ── Contenu principal ── */}
        <div className="flex-1  flex flex-col">
          <header className="fixed top-0 left-64 w-[calc(100%-16rem)] h-[72px] bg-white border-b border-slate-100 z-30 flex items-center justify-between px-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse shrink-0" />
              <div className="flex flex-col gap-1.5">
                <div className="w-40 h-3.5 bg-slate-100 rounded-lg animate-pulse" />
                <div className="w-64 h-3 bg-slate-50 rounded-lg animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-44 h-10 bg-slate-100 rounded-full animate-pulse" />
              <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse" />
            </div>
          </header>
  
          <main className="mt-[72px] p-8 space-y-8">
            <div className="space-y-2">
              <div className="w-48 h-8 bg-slate-100 rounded-xl animate-pulse" />
              <div className="w-80 h-4 bg-slate-50 rounded-lg animate-pulse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="w-28 h-3.5 bg-slate-100 rounded animate-pulse" />
                    <div className="w-8 h-8 rounded-xl bg-slate-50 animate-pulse" />
                  </div>
                  <div className="w-20 h-8 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="w-16 h-3 bg-slate-50 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
}
