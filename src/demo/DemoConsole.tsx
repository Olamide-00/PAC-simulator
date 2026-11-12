import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { CheckCircle2, Circle, ExternalLink, Play, RotateCcw, Smartphone, Truck, LayoutDashboard, Server, Wand2, ShieldX } from 'lucide-react';
import { PhoneFrame } from '../components/Phone';
import CustomerApp from '../customer/CustomerApp';
import DriverApp from '../driver/DriverApp';
import { useStore } from '../lib/store';
import { useDb, useNow } from '../lib/selectors';
import { ago, time } from '../lib/format';
import type { DB } from '../lib/seed';
import type { SystemEvent } from '../lib/types';

const DEMO_CUSTOMER = 'C-1001';
const demoOrder = (db: DB) => db.orders.find((o) => o.customerId === DEMO_CUSTOMER && parseInt(o.id.slice(4), 10) > 10255 && !o.id.endsWith('-R'));
const demoTrip = (db: DB) => { const o = demoOrder(db); return o?.tripId ? db.trips.find((t) => t.id === o.tripId) : undefined; };

interface Step { who: 'Customer' | 'Admin' | 'Driver'; title: string; desc: string; done: (db: DB) => boolean; auto: () => void; link?: string }

const TRUCK = 'V-01';
function buildSteps(): Step[] {
  const S = () => useStore.getState();
  const db = () => S().db;
  const truck = (d: DB) => d.vehicles.find((v) => v.id === TRUCK)!;
  return [
    { who: 'Customer', title: 'Customer places an order', desc: 'Customer App → Order Petrol → choose litres → Home → Bank transfer → Place order.', done: (d) => !!demoOrder(d),
      auto: () => S().placeOrder({ qty: 300, addressId: 'A-1', method: 'bank_transfer', requestId: `auto-${Date.now()}` }) },
    { who: 'Customer', title: 'Customer pays & uploads the receipt', desc: 'Customer App → transfer to PAC’s account → upload the receipt.', done: (d) => { const o = demoOrder(d); const p = o && d.payments.find((x) => x.id === o.paymentId); return !!p && ['verification_pending', 'verified'].includes(p.status); },
      auto: () => { const o = demoOrder(db()); if (o) S().submitTransferEvidence(o.id, o.total, '0099123344'); } },
    { who: 'Admin', title: '1 · Admin confirms the order', desc: 'Admin → Orders → open the order → “Payment received — confirm order”.', link: '/admin/orders', done: (d) => { const o = demoOrder(d); return !!o && !['received', 'awaiting_payment', 'payment_verification', 'awaiting_confirmation'].includes(o.status); },
      auto: () => { const o = demoOrder(db()); if (!o) return; S().setStaff('S-01'); S().confirmOrder(o.id); } },
    { who: 'Admin', title: 'Admin loads fuel into the truck', desc: 'Admin → Fuel & Inventory → truck LSD 482 XA → “Fill up” → Load into truck. (The truck starts empty.)', link: '/admin/inventory', done: (d) => truck(d).fuel >= 2800 || !!demoOrder(d)?.tripId,
      auto: () => { const v = truck(db()); S().setStaff('S-01'); S().loadTruck(v.id, v.capacity - v.fuel); } },
    { who: 'Admin', title: '2 · Admin assigns a driver', desc: 'Admin → Orders → open the order → pick Emeka (truck LSD 482 XA) → Assign driver. Do the same for PAC-10250 and PAC-10251 — they join Emeka’s trip as extra stops.', link: '/admin/orders', done: (d) => !!demoOrder(d)?.tripId,
      auto: () => {
        const d = db(); const o = demoOrder(d); if (!o) return;
        S().setStaff('S-01');
        S().assignOrderToDriver(o.id, 'D-01');
        d.orders.filter((x) => x.status === 'confirmed' && x.id !== o.id).forEach((x) => S().assignOrderToDriver(x.id, 'D-01'));
      } },
    { who: 'Driver', title: 'Driver accepts & starts the trip', desc: 'Driver App → Accept delivery → Start trip. The truck appears live on the map.', done: (d) => { const t = demoTrip(d); return !!t && !['assigned', 'acknowledged'].includes(t.status); },
      auto: () => { const t = demoTrip(db()); if (!t) return; S().setDriverSession(t.driverId); if (t.status === 'assigned') S().acknowledgeTrip(t.id); S().startTrip(t.id); } },
    { who: 'Driver', title: 'Driver delivers & enters the code', desc: 'Driver App → Go to stop → litres → customer’s 4-digit code (shown in the Customer App) → Confirm. Repeat for each stop; the trip finishes by itself.', done: (d) => demoTrip(d)?.status === 'completed',
      auto: () => {
        const t = demoTrip(db()); if (!t || t.status !== 'in_transit') return; S().setDriverSession(t.driverId);
        const s = t.stops.find((x) => x.status === 'pending'); if (!s) return;
        const o = db().orders.find((x) => x.id === s.orderId)!;
        S().completeStop(t.id, s.id, s.orderedQty, o.deliveryOtp);
      } },
  ];
}

const whoIcon = { Customer: Smartphone, Admin: LayoutDashboard, Driver: Truck };
const srcTone: Record<SystemEvent['source'], string> = {
  'Customer App': 'bg-status-info/10 text-status-info', 'Driver App': 'bg-brand-accent/25 text-brand-accent-deep', 'Admin Dashboard': 'bg-brand-secondary/10 text-brand-secondary',
  Backend: 'bg-ink/10 text-ink', 'Payment Gateway': 'bg-[#011B33]/10 text-[#011B33]', GPS: 'bg-status-success/10 text-status-success',
};

export default function DemoConsole() {
  const db = useDb();
  const now = useNow(2000);
  const resetDemo = useStore((s) => s.resetDemo);
  const steps = buildSteps();
  const doneFlags = steps.map((s) => s.done(db));
  const current = doneFlags.findIndex((d) => !d);

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent-deep">Live demo console</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">All three apps, one shared backend — live</h1>
          <p className="mt-2 text-sm text-ink-soft">Use the Customer and Driver apps below and the Admin Dashboard in another window — every action updates the others instantly. Follow the guided steps, or press <b>Do it</b> to advance the scenario automatically.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/admin" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-secondary"><LayoutDashboard size={16} /> Open Admin in new window <ExternalLink size={13} /></a>
          <button onClick={() => { if (confirm('Reset all demo data?')) { resetDemo(); } }} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold"><RotateCcw size={15} /> Reset demo</button>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[340px_auto_auto_1fr] xl:grid-cols-[340px_1fr_1fr]">
        {/* Walkthrough */}
        <div className="rounded-2xl border border-line bg-white p-4 shadow-card xl:row-span-2 2xl:row-span-1">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Guided scenario</h2><span className="text-xs font-semibold text-ink-soft">{doneFlags.filter(Boolean).length}/{steps.length}</span></div>
          <ol className="space-y-2">
            {steps.map((s, i) => {
              const done = doneFlags[i];
              const isCur = i === current;
              const I = whoIcon[s.who];
              return (
                <li key={i} className={clsx('rounded-xl border p-3 transition', isCur ? 'border-brand-secondary bg-brand-secondary/5' : done ? 'border-line bg-surface-secondary/40' : 'border-line opacity-70')}>
                  <div className="flex items-start gap-2.5">
                    {done ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-status-success" /> : <Circle size={18} className={clsx('mt-0.5 shrink-0', isCur ? 'text-brand-secondary' : 'text-line')} />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft"><I size={12} />{s.who}</div>
                      <div className="text-[13.5px] font-semibold">{i + 1}. {s.title}</div>
                      {isCur && <p className="mt-1 text-[12px] leading-relaxed text-ink/75">{s.desc}</p>}
                      {isCur && (
                        <div className="mt-2 flex gap-2">
                          <button onClick={s.auto} className="inline-flex items-center gap-1 rounded-md bg-brand-accent px-2.5 py-1 text-[12px] font-semibold text-brand-primary"><Wand2 size={12} /> Do it</button>
                          {s.link && <a href={s.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-[12px] font-semibold">Open in Admin <ExternalLink size={11} /></a>}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          {current === -1 && <div className="mt-3 rounded-xl bg-status-success/10 p-3 text-[13px] font-medium text-status-success">Done! Check Fuel & Inventory: the litres delivered came off the truck. Reports and Audit Logs show the full record.</div>}
          <p className="mt-3 text-[11px] text-ink-soft">“Do it” switches the acting staff member / driver automatically, just like different people working in the real system.</p>
        </div>

        <PhoneFrame label="Customer App · Tolu Bakare"><CustomerApp /></PhoneFrame>
        <PhoneFrame label="Driver App · Emeka Obi"><DriverApp /></PhoneFrame>

        {/* Event stream */}
        <div className="flex min-h-[400px] flex-col rounded-2xl bg-brand-primary p-4 text-white shadow-card xl:col-span-2 2xl:col-span-1 2xl:max-h-[800px]">
          <div className="mb-3 flex items-center gap-2"><Server size={16} className="text-brand-accent" /><h2 className="font-bold">Central backend — event stream</h2><span className="ml-auto flex items-center gap-1.5 text-[11px] text-white/60"><span className="h-2 w-2 animate-pulse rounded-full bg-status-success" /> live</span></div>
          <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 scroll-thin">
            {db.events.slice(0, 60).map((e) => (
              <div key={e.id} className="slide-up rounded-lg bg-white/[.04] p-2.5 ring-1 ring-white/10">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className={clsx('rounded px-1.5 py-0.5 font-semibold', srcTone[e.source], 'bg-white/90')}>{e.source}</span>
                  <span className="font-mono text-brand-accent">{e.event}</span>
                  <span className="ml-auto text-white/40" title={time(e.at)}>{ago(e.at, now)}</span>
                </div>
                <div className="mt-1 text-[12px] text-white/80">{e.detail}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3 text-[11px] text-white/55"><ShieldX size={13} /> Denied requests (403) also appear here and in Audit Logs.</div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[[Smartphone, 'Customer App full screen', '/customer'], [Truck, 'Driver App full screen', '/driver'], [LayoutDashboard, 'Admin Dashboard', '/admin']].map(([I, t, to]: any) => (
          <Link key={to} to={to} className="flex items-center gap-3 rounded-xl border border-line bg-white p-4 shadow-card hover:border-brand-secondary/40"><I size={20} className="text-brand-secondary" /><span className="font-semibold">{t}</span><Play size={14} className="ml-auto text-ink-soft" /></Link>
        ))}
      </div>
    </div>
  );
}
