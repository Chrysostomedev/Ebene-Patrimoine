/**
 * app/admin/loading.tsx
 *
 * Next.js 13+ charge ce fichier automatiquement lors de chaque navigation
 * entre les pages du segment /admin et ses sous-segments (/admin/sites, /admin/tickets, etc.)
 * Aucun import ni appel manuel nécessaire dans les pages.
 *
 * Palette : blanc pur + gris slate (cohérent avec le design system CANAL+)
 */

export default function AdminLoading() {
    return (
      <div className="flex min-h-screen bg-gray-50 font-sans">
  
        {/* ── Sidebar skeleton ── */}
        <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-100 z-20 flex flex-col px-5 py-6 gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-slate-100 animate-pulse" />
            <div className="w-24 h-4 bg-slate-100 rounded-lg animate-pulse" />
          </div>
  
          {/* Nav items */}
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
  
          {/* Bottom user */}
          <div className="mt-auto flex items-center gap-3 px-2 pt-4 border-t border-slate-50">
            <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="w-3/4 h-3 bg-slate-100 rounded animate-pulse" />
              <div className="w-1/2 h-2.5 bg-slate-50 rounded animate-pulse" />
            </div>
          </div>
        </aside>
  
        {/* ── Contenu principal ── */}
        <div className="flex-1 pl-64 flex flex-col">
  
          {/* Navbar skeleton */}
          <header className="fixed top-0 left-64 w-[calc(100%-16rem)] h-[72px] bg-white border-b border-slate-100 z-30 flex items-center justify-between px-8">
            {/* Gauche : avatar + nom */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse shrink-0" />
              <div className="flex flex-col gap-1.5">
                <div className="w-40 h-3.5 bg-slate-100 rounded-lg animate-pulse" />
                <div className="w-64 h-3 bg-slate-50 rounded-lg animate-pulse" />
              </div>
            </div>
            {/* Droite : notif + avatar */}
            <div className="flex items-center gap-4">
              <div className="w-44 h-10 bg-slate-100 rounded-full animate-pulse" />
              <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse" />
            </div>
          </header>
  
          {/* Main content */}
          <main className="mt-[72px] p-8 space-y-8">
  
            {/* PageHeader skeleton */}
            <div className="space-y-2">
              <div className="w-48 h-8 bg-slate-100 rounded-xl animate-pulse" />
              <div className="w-80 h-4 bg-slate-50 rounded-lg animate-pulse" />
            </div>
  
            {/* KPIs row */}
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
  
            {/* Action bar skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <div className="w-20 h-9 bg-slate-100 rounded-xl animate-pulse" />
                <div className="w-24 h-9 bg-slate-100 rounded-xl animate-pulse" />
              </div>
              <div className="flex gap-3">
                <div className="w-32 h-10 bg-slate-100 rounded-xl animate-pulse" />
                <div className="w-28 h-10 bg-slate-100 rounded-xl animate-pulse" />
                <div className="w-24 h-10 bg-slate-100 rounded-xl animate-pulse" />
                <div className="w-40 h-10 bg-slate-900/10 rounded-xl animate-pulse" />
              </div>
            </div>
  
            {/* Content card skeleton — s'adapte aux grilles cartes OU aux tables */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
  
              {/* Search bar */}
              <div className="w-72 h-10 bg-slate-50 rounded-xl animate-pulse" />
  
              {/* Grille cartes (3 colonnes — préstataires, sites) */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-slate-50 rounded-2xl p-5 space-y-4 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-200 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="w-3/4 h-4 bg-slate-200 rounded animate-pulse" />
                        <div className="w-1/2 h-3 bg-slate-100 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-3 bg-slate-100 rounded animate-pulse" />
                      <div className="w-5/6 h-3 bg-slate-100 rounded animate-pulse" />
                      <div className="w-2/3 h-3 bg-slate-50 rounded animate-pulse" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <div className="flex-1 h-9 bg-slate-200 rounded-xl animate-pulse" />
                      <div className="flex-1 h-9 bg-slate-100 rounded-xl animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
  
              {/* Pagination */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="w-36 h-3.5 bg-slate-100 rounded animate-pulse" />
                <div className="flex gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="w-9 h-9 rounded-xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
  
          </main>
        </div>
      </div>
    );
  }