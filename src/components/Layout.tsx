import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { cx } from '../lib/cx';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/exercises', label: 'Exercises' },
  { to: '/muscles', label: 'Muscles' },
  { to: '/compare', label: 'Compare' },
  { to: '/import', label: 'Import' },
  { to: '/settings', label: 'Settings' },
];

export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2 py-3 font-semibold text-ink">
            <img src="./favicon.svg" alt="" className="h-6 w-6" />
            <span>Overload</span>
          </NavLink>
          <nav aria-label="Main" className="-mb-px flex flex-1 gap-1 overflow-x-auto">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cx(
                    'border-b-2 px-2.5 py-3.5 text-sm font-medium whitespace-nowrap',
                    isActive
                      ? 'border-accent text-ink'
                      : 'border-transparent text-ink-2 hover:text-ink',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Suspense fallback={<p className="text-sm text-ink-3">Loading…</p>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
