import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { Menu, PlayCircle, X } from 'lucide-react';
import { Wordmark } from '../components/ui';
import { useEffect } from 'react';

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/architecture', label: 'Architecture' },
  { to: '/integrations', label: 'Integrations' },
  { to: '/rules', label: 'Business Rules' },
  { to: '/design', label: 'Brand & UI' },
  { to: '/delivery', label: 'Delivery Plan' },
];

export default function ExplorerLayout() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-white/92 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link to="/" aria-label="PAC Petrol home"><Wordmark sub="Platform Blueprint" /></Link>
          <nav className="hidden items-center gap-0.5 lg:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => clsx('rounded-md px-3 py-2 text-[13px] font-medium transition', isActive ? 'bg-surface-secondary text-brand-primary' : 'text-ink-soft hover:text-ink')}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/demo" className="hidden items-center gap-1.5 rounded-lg bg-brand-accent px-3.5 py-2 text-sm font-semibold text-brand-primary transition hover:bg-[#cdb576] sm:inline-flex">
              <PlayCircle size={16} /> Live Demo
            </Link>
            <button className="rounded-md p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-line bg-white px-4 py-2 lg:hidden">
            {[...NAV, { to: '/demo', label: '▶ Live Demo' }].map((n) => (
              <NavLink key={n.to} to={n.to} end={(n as any).end} className={({ isActive }) => clsx('block rounded-md px-3 py-2.5 text-sm font-medium', isActive ? 'bg-surface-secondary text-brand-primary' : 'text-ink')}>{n.label}</NavLink>
            ))}
          </nav>
        )}
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="bg-brand-primary text-white/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm">
          <Wordmark dark sub="Fuel delivered. Trust guaranteed." />
          <p className="max-w-xl text-xs leading-relaxed">
            Interactive demonstration prepared from the PAC Petrol requirement documents (Admin Dashboard Specification, Customer App FRS, Driver App FRS, Functional Requirements Specification, Brand Specification).
            Prices, fees and policies shown are illustrative pending management approval.
          </p>
        </div>
      </footer>
    </div>
  );
}
