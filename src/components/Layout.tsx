import { IconoirProvider } from 'iconoir-react';
import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useDemoSeed } from '../hooks/useSampleData';
import { cx } from '../lib/cx';
import { CompareIcon, DashboardIcon, ExercisesIcon, MusclesIcon, SettingsIcon } from './icons';
import { Muted } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/exercises', label: 'Exercises', icon: ExercisesIcon },
  { to: '/muscles', label: 'Muscles', icon: MusclesIcon },
  { to: '/compare', label: 'Compare', icon: CompareIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

/** Icons inherit the text size and colour around them, so they never need sizing per use. */
const ICON_PROPS = { width: '1.15em', height: '1.15em', strokeWidth: 1.8 };

/** Tab-bar icons sit above their label, so they are sized rather than matched to the text. */
const TAB_ICON_PROPS = { width: 22, height: 22 };

export function Layout() {
  useDemoSeed();
  return (
    <IconoirProvider iconProps={ICON_PROPS}>
      <div className="min-h-screen">
        <header className="sticky top-[env(safe-area-inset-top,0px)] z-10 border-b border-border bg-surface/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 sm:px-6">
            <NavLink to="/" className="flex items-center gap-2 py-3 font-semibold text-ink">
              <img src="./favicon.svg" alt="" className="h-6 w-6" />
              <span>Overload</span>
            </NavLink>
            {/* Phones get the bottom tab bar instead; this row would only crowd the title. */}
            <nav aria-label="Main" className="-mb-px hidden flex-1 gap-1 overflow-x-auto sm:flex">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-1.5 border-b-2 px-2.5 py-3.5 text-sm font-medium whitespace-nowrap',
                      isActive
                        ? 'border-accent text-ink'
                        : 'border-transparent text-ink-2 hover:text-ink',
                    )
                  }
                >
                  <n.icon aria-hidden="true" />
                  <span>{n.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        {/* The tab bar sits over the page, so the last card needs room to clear it. */}
        <main className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6 sm:py-8">
          <Suspense fallback={<Muted>Loading…</Muted>}>
            <Outlet />
          </Suspense>
        </main>

        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur sm:hidden"
        >
          <ul className="flex">
            {NAV.map((n) => (
              <li key={n.to} className="min-w-0 flex-1">
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    cx(
                      'flex flex-col items-center gap-1 px-1 pt-2 pb-1.5 text-[11px] font-medium',
                      isActive ? 'text-accent' : 'text-ink-2',
                    )
                  }
                >
                  <n.icon aria-hidden="true" {...TAB_ICON_PROPS} />
                  <span className="max-w-full truncate">{n.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </IconoirProvider>
  );
}
