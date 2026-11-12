import { Link } from 'react-router-dom';
import {
  ArrowRight, Smartphone, Truck, LayoutDashboard, ShieldCheck, Banknote, Route, Gauge, MapPinOff, ScrollText, Database, PlayCircle, Layers, Plug, Scale, Palette, CalendarRange,
} from 'lucide-react';

const apps = [
  {
    icon: Smartphone, name: 'Customer App', who: 'Households & businesses · Android / iOS', to: '/customer',
    points: ['Register with phone OTP', 'Order PMS by the litre with live price', 'Pay by card or bank transfer', 'Track the tanker & share a delivery code', 'Order history, receipts, complaints'],
  },
  {
    icon: Truck, name: 'Driver App', who: 'Approved PAC drivers · Android / iOS', to: '/driver',
    points: ['See the deliveries assigned to you', 'Accept, then Start trip', 'Navigate stop-by-stop', 'Deliver: enter litres + the customer’s code', 'Report a delivery that couldn’t be made'],
  },
  {
    icon: LayoutDashboard, name: 'Admin Dashboard', who: 'PAC staff · Web (desktop & tablet)', to: '/admin',
    points: ['Drivers: add, suspend, delete, give a truck', 'Vehicles: add trucks, maintenance, delete', 'Fuel: load petrol into a truck', 'Orders: confirm, then assign a driver', 'Live tracking of every truck', 'Payments, reports, audit logs'],
  },
];

const principles = [
  { icon: Database, t: 'One source of truth', d: 'All three apps read and write one central backend. An order placed on a phone appears on the dashboard instantly; a delivery recorded by a driver updates the customer in real time.' },
  { icon: Banknote, t: 'Only verified money counts', d: 'A receipt screenshot is evidence, not payment. Revenue is calculated only from finance- or gateway-verified records. Drivers can never verify payments.' },
  { icon: Route, t: 'Multi-customer trips', d: 'One tanker trip can carry several orders. Each order becomes its own stop with its own quantity, proof of delivery and outcome.' },
  { icon: Gauge, t: 'Every litre accounted for', d: 'Fuel moves supplier → depot → truck → customer, and every move is recorded. Each delivery comes off the truck’s balance; the 5,000 L capacity is enforced by the backend.' },
  { icon: ShieldCheck, t: 'Delivery needs the customer’s code', d: 'A stop is only complete when the driver records the actual litres and enters the customer’s one-time 4-digit code.' },
  { icon: MapPinOff, t: 'Honest tracking', d: 'Live, stale, offline and no-permission GPS states are shown distinctly. An old position is never presented as live.' },
  { icon: ScrollText, t: 'Accountable by design', d: 'Role-based permissions are enforced server-side and every sensitive action — price change, verification, adjustment — is written to an immutable audit log.' },
];

const explore = [
  { to: '/how-it-works', icon: PlayCircle, t: 'How It Works', d: 'The 8-stage journey from setting up trucks to petrol in the customer’s tank.' },
  { to: '/architecture', icon: Layers, t: 'Architecture', d: 'System components, recommended tech stack, data model and realtime event flow.' },
  { to: '/integrations', icon: Plug, t: 'Integrations', d: 'Payments, bank transfer verification, maps, GPS, SMS OTP, push, email, storage, monitoring.' },
  { to: '/rules', icon: Scale, t: 'Business Rules', d: 'Backend-enforced rules, roles & permissions, and the policy decisions management must make.' },
  { to: '/design', icon: Palette, t: 'Brand & UI', d: 'Executive Evergreen palette, typography, status colours and design tokens.' },
  { to: '/delivery', icon: CalendarRange, t: 'Delivery Plan', d: 'Phases, deliverables, acceptance tests and launch readiness checklist.' },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-primary text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(23,75,61,.9),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-accent/40 bg-white/5 px-3 py-1 text-xs font-medium text-brand-accent">
              Lagos, Nigeria · Premium Motor Spirit (PMS) · 5,000 L tanker
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              The digital operating system for <span className="text-brand-accent">petrol delivery</span>.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/75">
              PAC Petrol is not just an app that takes orders. It is three connected applications — for customers, drivers and PAC staff — running on one backend that controls
              ordering, payment, drivers and trucks, fuel stock, live delivery and every litre from depot to customer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/demo" className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-5 py-3 text-sm font-semibold text-brand-primary hover:bg-[#cdb576]">
                <PlayCircle size={18} /> Launch the live demo
              </Link>
              <Link to="/how-it-works" className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
                See how it works <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          <div className="relative">
            <img src="/brand/pac-lockup.jpg" alt="PAC Petrol — Fuel delivered. Trust guaranteed." className="w-full rounded-2xl shadow-2xl ring-1 ring-brand-accent/30" />
          </div>
        </div>
      </section>

      {/* Three apps */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-8 max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent-deep">The platform</div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Three apps. One backend. One record of truth.</h2>
          <p className="mt-2 text-ink-soft">Each application is built for its user — simplicity for customers, clarity for drivers, control for management — and none of them keeps its own separate records.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {apps.map((a) => (
            <div key={a.name} className="flex flex-col rounded-2xl border border-line bg-white p-6 shadow-card">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary text-brand-accent"><a.icon size={22} /></div>
              <h3 className="text-lg font-bold">{a.name}</h3>
              <div className="text-xs text-ink-soft">{a.who}</div>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {a.points.map((p) => <li key={p} className="flex gap-2"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-accent" />{p}</li>)}
              </ul>
              <Link to={a.to} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-secondary hover:underline">Open {a.name} <ArrowRight size={15} /></Link>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-line bg-white p-5 text-sm shadow-card">
          <div className="flex flex-wrap items-center justify-center gap-3 text-center font-medium">
            {['Customer App', 'Central Backend & Database', 'Driver App'].map((x, i) => (
              <span key={x} className="flex items-center gap-3">
                <span className={i === 1 ? 'rounded-lg bg-brand-primary px-4 py-2 text-white' : 'rounded-lg bg-surface-secondary px-4 py-2'}>{x}</span>
                {i < 2 && <span className="text-brand-accent-deep">⇄</span>}
              </span>
            ))}
            <span className="text-brand-accent-deep">⇅</span>
            <span className="rounded-lg bg-surface-secondary px-4 py-2">Admin Dashboard</span>
          </div>
          <p className="mt-3 text-center text-xs text-ink-soft">Authentication · Orders · Payments · Inventory · Dispatch · Tracking · Notifications · Reports · Audit</p>
        </div>
      </section>

      {/* Principles */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent-deep">Non-negotiables</div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">What makes this trustworthy</h2>
            <p className="mt-2 text-ink-soft">Petrol is high-value and highly flammable. These rules, taken directly from the requirement documents, are designed into the backend from day one — and you can see each one working in the demo.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((p) => (
              <div key={p.t} className="rounded-xl border border-line bg-surface-secondary/50 p-5">
                <p.icon size={20} className="text-brand-secondary" />
                <h3 className="mt-3 font-semibold">{p.t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{p.d}</p>
              </div>
            ))}
            <div className="flex flex-col justify-between rounded-xl bg-brand-primary p-5 text-white">
              <div>
                <h3 className="font-semibold text-brand-accent">Built to grow</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/75">Starts with one 5,000 L tanker and PMS in Lagos — but vehicles, drivers, products, service areas and depots are all data, not code.</p>
              </div>
              <Link to="/architecture" className="mt-4 text-sm font-semibold text-brand-accent hover:underline">See the architecture →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Baseline */}
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 lg:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent-deep">Initial configuration</div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Launch baseline</h2>
          <p className="mt-2 text-ink-soft">The operational starting point defined by PAC Petrol. Everything marked configurable can be changed from the dashboard without new code.</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          {[
            ['Business', 'PAC Petrol'], ['Location', 'Lagos, Nigeria'], ['Product', 'Premium Motor Spirit (PMS / Petrol)'],
            ['Fleet', 'One tanker · 5,000 L maximum capacity'], ['Customers', 'Households and businesses'],
            ['Customer & driver interface', 'Mobile apps (Android & iOS)'], ['Management interface', 'Web dashboard'],
            ['Price, fees, limits, areas, hours', 'Configurable — pending management approval'], ['Brand direction', 'Premium · Executive Evergreen'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-line px-5 py-3 text-sm last:border-0">
              <span className="text-ink-soft">{k}</span><span className="text-right font-medium">{v}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Explore */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <h2 className="mb-5 text-xl font-bold">Explore the blueprint</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {explore.map((e) => (
            <Link key={e.to} to={e.to} className="group rounded-xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand-secondary/40">
              <e.icon size={20} className="text-brand-accent-deep" />
              <h3 className="mt-3 font-semibold group-hover:text-brand-secondary">{e.t}</h3>
              <p className="mt-1 text-[13px] text-ink-soft">{e.d}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
