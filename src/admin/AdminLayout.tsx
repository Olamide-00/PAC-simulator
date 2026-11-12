import { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard, ClipboardList, MapPinned, Fuel, Wallet, Users, IdCard, Truck, MessageSquareWarning, Bell, BarChart3, ScrollText, Settings,
  ChevronsLeft, ChevronsRight, Search, HelpCircle, LogOut, Menu, Wifi, ShieldX, RotateCcw, MonitorPlay,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { can, type Permission } from '../lib/permissions';
import { roleLabel } from '../lib/format';
import { kpis, useCurrentStaff, useDb } from '../lib/selectors';
import { Monogram } from '../components/ui';

// Sidebar follows the day-to-day flow: people & trucks → fuel → orders → tracking, then back-office modules.
export const MODULES: { to: string; label: string; icon: typeof LayoutDashboard; perm?: Permission; group?: string; count?: (k: ReturnType<typeof kpis>, x: { unread: number; pendingDrivers: number }) => number }[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList, perm: 'orders.view', group: 'Daily work', count: (k) => k.needsAction },
  { to: '/admin/tracking', label: 'Live Tracking', icon: MapPinned, perm: 'tracking.view', count: (k) => k.inTransit },
  { to: '/admin/drivers', label: 'Drivers', icon: IdCard, perm: 'drivers.view', group: 'Fleet & fuel', count: (_k, x) => x.pendingDrivers },
  { to: '/admin/vehicles', label: 'Vehicles', icon: Truck, perm: 'vehicles.view' },
  { to: '/admin/inventory', label: 'Fuel & Inventory', icon: Fuel, perm: 'inventory.view' },
  { to: '/admin/payments', label: 'Payments', icon: Wallet, perm: 'payments.view', group: 'Back office', count: (k) => k.paymentsAwaiting },
  { to: '/admin/customers', label: 'Customers', icon: Users, perm: 'customers.view' },
  { to: '/admin/complaints', label: 'Complaints & Support', icon: MessageSquareWarning, perm: 'complaints.view', count: (k) => k.openComplaints },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell, count: (_k, x) => x.unread },
  { to: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3, perm: 'reports.view' },
  { to: '/admin/audit', label: 'Audit Logs', icon: ScrollText, perm: 'audit.view' },
  { to: '/admin/settings', label: 'Settings', icon: Settings, perm: 'settings.view' },
];

export default function AdminLayout() {
  const db = useDb();
  const staff = useCurrentStaff();
  const setStaff = useStore((s) => s.setStaff);
  const resetDemo = useStore((s) => s.resetDemo);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState('');
  const loc = useLocation();
  const navigate = useNavigate();
  const k = kpis(db);
  const extra = {
    unread: db.notifications.filter((n) => n.audience === 'admin' && !n.read).length,
    pendingDrivers: db.drivers.filter((d) => !d.removed && d.status === 'pending_approval').length,
  };
  const visible = MODULES.filter((m) => !m.perm || can(staff.role, m.perm));
  const current = [...MODULES].reverse().find((m) => loc.pathname.startsWith(m.to)) ?? MODULES[0];
  const allowed = !current.perm || can(staff.role, current.perm);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const out: { label: string; sub: string; to: string }[] = [];
    db.orders.filter((o) => o.id.toLowerCase().includes(s) || db.customers.find((c) => c.id === o.customerId)?.name.toLowerCase().includes(s)).slice(0, 5)
      .forEach((o) => out.push({ label: o.id, sub: `Order · ${db.customers.find((c) => c.id === o.customerId)?.name}`, to: `/admin/orders?open=${o.id}` }));
    db.trips.filter((t) => t.id.toLowerCase().includes(s)).slice(0, 3).forEach((t) => out.push({ label: t.id, sub: 'Trip', to: `/admin/tracking?trip=${t.id}` }));
    db.customers.filter((c) => c.name.toLowerCase().includes(s) || c.id.toLowerCase().includes(s)).slice(0, 3).forEach((c) => out.push({ label: c.name, sub: `Customer · ${c.id}`, to: `/admin/customers?open=${c.id}` }));
    return out;
  }, [q, db]);

  const Sidebar = (
    <aside className={clsx('flex h-full flex-col bg-brand-primary text-white/80 transition-all', collapsed ? 'w-[72px]' : 'w-64')}>
      <div className={clsx('flex h-16 items-center gap-2.5 border-b border-white/10', collapsed ? 'justify-center px-2' : 'px-4')}>
        <Monogram className="h-9" />
        {!collapsed && <div className="leading-none"><div className="text-[14px] font-extrabold tracking-[0.12em] text-white">PAC PETROL</div><div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-brand-accent">Admin Dashboard</div></div>}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5 scroll-thin">
        {visible.map((m) => {
          const n = m.count?.(k, extra) ?? 0;
          return (
            <div key={m.to}>
            {m.group && !collapsed && <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{m.group}</div>}
            <NavLink key={m.to} to={m.to} end={m.to === '/admin'} onClick={() => setMobileOpen(false)} title={m.label}
              className={({ isActive }) => clsx('group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition', isActive ? 'bg-brand-secondary text-white' : 'hover:bg-white/5 hover:text-white', collapsed && 'justify-center px-0')}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-brand-accent" />}
                  <m.icon size={18} className={isActive ? 'text-brand-accent' : ''} />
                  {!collapsed && <span className="flex-1 truncate">{m.label}</span>}
                  {n > 0 && <span className={clsx('flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold', collapsed ? 'absolute right-1 top-1 h-4 min-w-4 text-[9px]' : '', 'bg-brand-accent text-brand-primary')}>{n}</span>}
                </>
              )}
            </NavLink>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-2.5">
        <button onClick={() => setCollapsed(!collapsed)} className="hidden w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-white/5 lg:flex">
          {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> Collapse</>}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-full">
      <div className="hidden h-full shrink-0 lg:block">{Sidebar}</div>
      {mobileOpen && <div className="fixed inset-0 z-50 flex lg:hidden"><div className="h-full">{Sidebar}</div><div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} /></div>}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white px-4">
          <button className="rounded-md p-1.5 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Menu"><Menu size={20} /></button>
          <div className="hidden min-w-0 md:block">
            <div className="text-[11px] text-ink-soft"><Link to="/" className="hover:underline">PAC Petrol</Link> / Admin / {current.label}</div>
            <div className="truncate text-[15px] font-semibold">{current.label}</div>
          </div>
          <div className="relative ml-auto w-full max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input className="input pl-9" placeholder="Search orders, trips, customers…" value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => setTimeout(() => setQ(''), 200)} />
            {results.length > 0 && (
              <div className="absolute inset-x-0 top-11 z-40 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
                {results.map((r) => <button key={r.to + r.label} onMouseDown={() => navigate(r.to)} className="block w-full px-3 py-2 text-left hover:bg-surface-secondary"><div className="text-[13px] font-semibold">{r.label}</div><div className="text-[11px] text-ink-soft">{r.sub}</div></button>)}
              </div>
            )}
          </div>
          <span className="hidden items-center gap-1.5 rounded-full bg-status-success/10 px-2.5 py-1 text-[11px] font-semibold text-status-success xl:inline-flex"><Wifi size={12} /> Backend connected</span>
          <Link to="/admin/notifications" className="relative rounded-lg p-2 hover:bg-surface-secondary" aria-label="Notifications"><Bell size={18} />{extra.unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-status-error" />}</Link>
          <Link to="/how-it-works" className="hidden rounded-lg p-2 hover:bg-surface-secondary sm:block" aria-label="Help"><HelpCircle size={18} /></Link>
          <div className="flex items-center gap-2 border-l border-line pl-3">
            <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-[11px] font-bold text-brand-accent sm:flex">{staff.name.split(' ').map((x) => x[0]).join('')}</div>
            <div className="leading-tight">
              <select value={staff.id} onChange={(e) => setStaff(e.target.value)} className="max-w-[170px] cursor-pointer bg-transparent text-[13px] font-semibold focus:outline-none" aria-label="Switch staff user (demo)">
                {db.staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <div className="text-[11px] text-brand-accent-deep">{roleLabel[staff.role]} · demo role switch</div>
            </div>
          </div>
          <Link to="/" className="rounded-lg p-2 text-ink-soft hover:bg-surface-secondary" title="Log out" aria-label="Log out"><LogOut size={18} /></Link>
        </header>

        <div className="flex items-center justify-between gap-2 border-b border-brand-accent/40 bg-[#fbf7ec] px-4 py-1.5 text-[11.5px] text-brand-accent-deep">
          <span className="truncate">Interactive demo · data is simulated and saved in this browser · prices are illustrative</span>
          <span className="flex shrink-0 gap-3">
            <Link to="/demo" className="inline-flex items-center gap-1 font-semibold hover:underline"><MonitorPlay size={13} /> Demo console</Link>
            <button onClick={() => { if (confirm('Reset all demo data to the starting state?')) resetDemo(); }} className="inline-flex items-center gap-1 font-semibold hover:underline"><RotateCcw size={12} /> Reset</button>
          </span>
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 scroll-thin">
          {allowed ? <Outlet /> : (
            <div className="mx-auto mt-16 max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-card">
              <ShieldX size={36} className="mx-auto text-status-error" />
              <h2 className="mt-3 text-lg font-bold">Access restricted</h2>
              <p className="mt-1 text-sm text-ink-soft">{roleLabel[staff.role]} does not have permission to view {current.label}. The backend would return 403 for this module’s data.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
