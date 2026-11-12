import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Smartphone, LayoutDashboard, Truck, Server, ArrowRight, ShieldAlert } from 'lucide-react';
import { Badge } from '../../components/ui';

type Actor = 'Customer' | 'Admin' | 'Driver' | 'Backend';
const actorIcon = { Customer: Smartphone, Admin: LayoutDashboard, Driver: Truck, Backend: Server };

const STAGES: {
  n: number; title: string; actor: Actor; summary: string;
  customer: string; admin: string; driver: string; rules: string[]; tryIt?: { to: string; label: string };
}[] = [
  {
    n: 1, title: 'Set up drivers & trucks', actor: 'Admin',
    summary: 'Once, at the start (and whenever the fleet changes): the admin adds trucks on the Vehicles page and drivers on the Drivers page, and gives each driver a truck.',
    customer: '—',
    admin: 'Vehicles: add / maintenance / suspend / delete. Drivers: add / approve / suspend / delete / give a truck.',
    driver: 'Signs in to the Driver App with the phone number PAC registered.',
    rules: ['No public driver sign-up — PAC adds drivers', 'A suspended driver or truck can’t be used', 'Drivers or trucks with history are archived, not erased'],
    tryIt: { to: '/admin/drivers', label: 'Open Drivers' },
  },
  {
    n: 2, title: 'Load fuel into the truck', actor: 'Admin',
    summary: 'Fuel arrives at the depot from the supplier. On Fuel & Inventory the admin loads litres from the depot into a truck. The truck now carries a fuel balance.',
    customer: '—',
    admin: 'Depot stock goes down, the truck’s “fuel on board” goes up. Every move is in the ledger.',
    driver: 'Sees how much fuel is on their truck.',
    rules: ['A truck can’t hold more than its capacity (5,000 L)', 'You can’t load more than the depot has', 'Leftover fuel can be unloaded back to the depot'],
    tryIt: { to: '/admin/inventory', label: 'Load a truck' },
  },
  {
    n: 3, title: 'Customer orders & pays', actor: 'Customer',
    summary: 'Customer picks litres, an address and a payment method. Card payments are verified automatically by the gateway; for a bank transfer the customer uploads the receipt.',
    customer: 'Sees the price breakdown, an order number, and “payment verification pending” for transfers.',
    admin: 'The order appears in Orders → “Needs your action”.',
    driver: '—',
    rules: ['Price comes from the backend, never the phone', 'Address must be in the delivery area', 'A receipt is evidence, not money — an admin checks it'],
    tryIt: { to: '/customer', label: 'Place an order' },
  },
  {
    n: 4, title: '1 · Admin confirms the order', actor: 'Admin',
    summary: 'Open the order and click Confirm. For a bank transfer the button reads “Payment received — confirm order”: the admin checks the money is in the bank, and one click accepts the payment and confirms the order.',
    customer: '“Order confirmed”.',
    admin: 'The litres are now promised to this customer, so they can’t be sold twice.',
    driver: '—',
    rules: ['Never auto-confirmed', 'Only staff allowed to handle money can accept a transfer', 'Checks: paid, enough petrol, address in area'],
    tryIt: { to: '/admin/orders', label: 'Confirm an order' },
  },
  {
    n: 5, title: '2 · Admin assigns a driver', actor: 'Admin',
    summary: 'In the same order window, pick a driver from the list. Their truck goes with them. If the truck doesn’t have enough fuel, a “Load fuel now” button appears. Give more orders to the same driver and they become extra stops on one trip.',
    customer: '“Driver assigned”.',
    admin: 'The order shows the driver and truck. It can still be changed until the driver starts.',
    driver: 'Gets a notification: new delivery.',
    rules: ['Only confirmed orders can be assigned', 'The truck must have enough fuel for all its deliveries', 'A driver already on the road can’t take more until they finish'],
    tryIt: { to: '/admin/orders', label: 'Assign a driver' },
  },
  {
    n: 6, title: 'Driver accepts & starts the trip', actor: 'Driver',
    summary: 'The driver sees the assigned deliveries, taps Accept, then Start trip when leaving the depot.',
    customer: '“Out for delivery”, plus a 4-digit delivery code and live tracking.',
    admin: 'Truck shows “On the road” on Live Tracking.',
    driver: 'Sees stop 1 with Navigate and Call buttons.',
    rules: ['Accepting is not starting', 'GPS is shared only while the trip is on', 'An old position is never shown as live'],
    tryIt: { to: '/driver', label: 'Open the Driver App' },
  },
  {
    n: 7, title: 'Driver delivers & enters the code', actor: 'Driver',
    summary: 'At each stop the driver dispenses, enters the litres and the customer’s 4-digit code. That is the proof of delivery. If it can’t be delivered, they choose a reason instead.',
    customer: '“Delivered”, or a clear message if it was partial or couldn’t be delivered.',
    admin: 'The litres come off the truck’s fuel balance. A partial or failed delivery shows up under Orders → Problems.',
    driver: 'Moves on to the next stop.',
    rules: ['Delivery needs the customer’s code', 'Can’t deliver more than ordered or more than is on the truck', 'One failed stop doesn’t affect the others'],
  },
  {
    n: 8, title: 'Trip finishes by itself', actor: 'Backend',
    summary: 'When every stop is done the trip closes automatically and the driver and truck are free for the next deliveries. Any fuel left stays on the truck for the next trip, or is unloaded back to the depot.',
    customer: 'Order history and receipt.',
    admin: 'Reports and the audit log are up to date. Partial/failed orders: choose “deliver the rest later” or “refund”.',
    driver: 'Trip moves to History.',
    rules: ['Fuel balance = loaded − delivered, always visible', 'Refund vs redelivery is a management decision, never automatic'],
    tryIt: { to: '/admin/inventory', label: 'See the truck’s fuel' },
  },
];

const LIFECYCLES = [
  { name: 'Order status', main: ['Awaiting Payment', 'Payment Verification', 'Order Confirmed', 'Driver Assigned', 'Out for Delivery', 'Delivered'], exceptions: ['Partially Delivered', 'Delivery Failed', 'Cancelled'] },
  { name: 'Payment status', main: ['Pending', 'Verification Pending', 'Verified'], exceptions: ['Failed', 'Rejected', 'Refund Pending', 'Refunded'] },
  { name: 'Trip status (driver)', main: ['Waiting for driver', 'Accepted', 'On the road', 'Completed'], exceptions: ['Cancelled'] },
  { name: 'Stop status (per order)', main: ['Pending', 'Delivered'], exceptions: ['Partial', 'Failed'] },
];

export default function HowItWorks() {
  const [sel, setSel] = useState(0);
  const s = STAGES[sel];
  const Icon = actorIcon[s.actor];
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8 max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent-deep">End-to-end journey</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">From “Order Petrol” to petrol in the tank</h1>
        <p className="mt-3 text-ink-soft">Eight simple stages, three apps, one backend. Select a stage to see what each person sees and which rules the backend enforces.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <ol className="space-y-1.5">
          {STAGES.map((st, i) => {
            const I = actorIcon[st.actor];
            return (
              <li key={st.n}>
                <button onClick={() => setSel(i)} className={clsx('flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition', i === sel ? 'border-brand-secondary bg-white shadow-card' : 'border-transparent hover:bg-white/70')}>
                  <span className={clsx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', i === sel ? 'bg-brand-primary text-brand-accent' : 'bg-white text-ink-soft ring-1 ring-line')}>{st.n}</span>
                  <span className="flex-1 text-[13px] font-medium leading-tight">{st.title}</span>
                  <I size={15} className="text-ink-soft" />
                </button>
              </li>
            );
          })}
        </ol>

        <div className="slide-up rounded-2xl border border-line bg-white p-6 shadow-card" key={sel}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary text-brand-accent"><Icon size={20} /></span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Stage {s.n} · {s.actor}</div>
              <h2 className="text-xl font-bold">{s.title}</h2>
            </div>
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-ink/85">{s.summary}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {([['Customer App', Smartphone, s.customer], ['Admin Dashboard', LayoutDashboard, s.admin], ['Driver App', Truck, s.driver]] as const).map(([n, I, txt]) => (
              <div key={n} className="rounded-xl bg-surface-secondary p-4">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-brand-secondary"><I size={14} />{n}</div>
                <p className="text-[13px] leading-relaxed">{txt}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-brand-accent/50 bg-[#fbf7ec] p-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-accent-deep"><ShieldAlert size={14} /> Enforced by the backend</div>
            <ul className="grid gap-1.5 text-[13px] sm:grid-cols-2">
              {s.rules.map((r) => <li key={r} className="flex gap-2"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-secondary" />{r}</li>)}
            </ul>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {s.tryIt ? <Link to={s.tryIt.to} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-secondary">Try it: {s.tryIt.label} <ArrowRight size={15} /></Link> : <span />}
            <div className="flex gap-2">
              <button disabled={sel === 0} onClick={() => setSel(sel - 1)} className="rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-40">← Previous</button>
              <button disabled={sel === STAGES.length - 1} onClick={() => setSel(sel + 1)} className="rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-40">Next →</button>
            </div>
          </div>
        </div>
      </div>

      {/* Lifecycles */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold tracking-tight">Four separate status models</h2>
        <p className="mt-2 max-w-3xl text-ink-soft">Order, payment, trip and stop status are independent fields. An order can be confirmed while a trip is still being built; a payment can be verified while delivery has failed. Collapsing them into one field is what makes most delivery apps unreliable.</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {LIFECYCLES.map((l) => (
            <div key={l.name} className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <h3 className="font-semibold">{l.name}</h3>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {l.main.map((m, i) => (
                  <span key={m} className="flex items-center gap-1.5">
                    <span className="rounded-md bg-brand-secondary/10 px-2 py-1 text-[12px] font-medium text-brand-secondary">{m}</span>
                    {i < l.main.length - 1 && <span className="text-ink-soft">→</span>}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Exceptions:</span>
                {l.exceptions.map((e) => <Badge key={e} tone={/Fail|Reject|Declin|Interr/.test(e) ? 'error' : 'warning'}>{e}</Badge>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Multi-customer example */}
      <section className="mt-16 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h3 className="text-lg font-bold">Example: one trip, three independent outcomes</h3>
          <p className="mt-1 text-sm text-ink-soft">A multi-customer trip is never treated as one indivisible delivery.</p>
          <table className="mt-4 w-full text-sm">
            <thead><tr className="border-b border-line text-left text-xs text-ink-soft"><th className="py-2">Customer</th><th>Ordered</th><th>Delivered</th><th>Outcome</th></tr></thead>
            <tbody>
              {[['A', '1,000 L', '1,000 L', <Badge key="a" tone="success">Completed</Badge>], ['B', '1,500 L', '1,200 L', <Badge key="b" tone="warning">Partial · 300 L outstanding</Badge>], ['C', '1,000 L', '0 L', <Badge key="c" tone="error">Failed</Badge>]].map((r) => (
                <tr key={String(r[0])} className="border-b border-line/60 last:border-0"><td className="py-2.5 font-semibold">{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-2xl bg-brand-primary p-6 text-white shadow-card">
          <h3 className="text-lg font-bold text-brand-accent">Where every litre goes</h3>
          <p className="mt-1 text-sm text-white/70">Fuel is tracked at every step, so nothing goes missing.</p>
          <div className="mt-5 rounded-xl bg-white/5 p-4 font-mono text-[14px]">Supplier → Depot → Truck → Customer</div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
            {[['Loaded', '5,000 L'], ['Delivered', '2,800 L'], ['On truck', '2,200 L'], ['Capacity', '5,000 L']].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-white/5 p-2"><div className="text-[11px] text-white/60">{k}</div><div className="font-semibold">{v}</div></div>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-white/75">Example: the admin loads 5,000 L into the truck. The driver delivers 300 L + 1,000 L + 1,500 L. The truck shows 2,200 L left, which can go on the next trip or be unloaded back to the depot.</p>
        </div>
      </section>
    </div>
  );
}
