import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Search, Truck, ChevronRight, UserRound, CircleAlert, Fuel, Navigation } from 'lucide-react';
import clsx from 'clsx';
import { Button, Card, Field, KV, Modal, PageHeader, StatusBadge, Tabs, ok, Callout } from '../../components/ui';
import { useDb } from '../../lib/selectors';
import { useStore, availableStock, truckCommitted } from '../../lib/store';
import { dateTime, litres, naira, orderStatusMeta, paymentStatusMeta } from '../../lib/format';
import type { Order } from '../../lib/types';
import type { DB } from '../../lib/seed';

type Filter = 'action' | 'delivery' | 'problems' | 'closed' | 'all';
const FILTERS: Record<Filter, (o: Order) => boolean> = {
  action: (o) => ['payment_verification', 'awaiting_confirmation', 'confirmed'].includes(o.status),
  delivery: (o) => ['assigned', 'out_for_delivery'].includes(o.status),
  problems: (o) => ['partially_delivered', 'delivery_failed'].includes(o.status),
  closed: (o) => ['delivered', 'completed', 'cancelled'].includes(o.status),
  all: () => true,
};

const driverOf = (db: DB, o: Order) => {
  const t = o.tripId ? db.trips.find((x) => x.id === o.tripId) : undefined;
  return t ? { t, d: db.drivers.find((x) => x.id === t.driverId), v: db.vehicles.find((x) => x.id === t.vehicleId) } : undefined;
};

export default function Orders() {
  const db = useDb();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>('action');
  const [q, setQ] = useState('');
  const openId = params.get('open');

  const rows = useMemo(() => db.orders.filter(FILTERS[filter]).filter((o) => {
    const c = db.customers.find((x) => x.id === o.customerId)!;
    const s = q.toLowerCase();
    return !s || [o.id, c.name, c.phone, o.address.area].some((v) => v.toLowerCase().includes(s));
  }), [db, filter, q]);
  const count = (f: Filter) => db.orders.filter(FILTERS[f]).length;

  return (
    <div>
      <PageHeader title="Orders" subtitle="Open an order to work on it. Every order has two admin steps: (1) confirm it, then (2) assign a driver. The driver’s truck goes with them." />
      <HowSteps />
      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <Tabs value={filter} onChange={setFilter} items={[
            { value: 'action', label: `Needs your action (${count('action')})` }, { value: 'delivery', label: `With a driver (${count('delivery')})` },
            { value: 'problems', label: `Problems (${count('problems')})` }, { value: 'closed', label: 'Closed' }, { value: 'all', label: `All (${db.orders.length})` },
          ]} />
          <div className="relative ml-auto"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft" /><input className="input w-56 pl-8" placeholder="Order, customer, area…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full">
            <thead className="bg-surface-secondary/60"><tr>{['Order', 'Customer', 'Litres', 'Total', 'Payment', 'Status', 'What’s next', 'Driver', 'Placed'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((o) => {
                const c = db.customers.find((x) => x.id === o.customerId)!;
                const p = db.payments.find((x) => x.id === o.paymentId)!;
                const dv = driverOf(db, o);
                return (
                  <tr key={o.id} onClick={() => setParams({ open: o.id })} className="cursor-pointer border-t border-line hover:bg-surface-secondary/50">
                    <td className="td font-semibold text-brand-secondary">{o.id}</td>
                    <td className="td">{c.name}<div className="text-[11px] text-ink-soft">{o.address.area}</div></td>
                    <td className="td font-medium">{litres(o.qty)}</td>
                    <td className="td">{naira(o.total)}</td>
                    <td className="td"><StatusBadge meta={paymentStatusMeta[p.status]} /></td>
                    <td className="td"><StatusBadge meta={orderStatusMeta[o.status]} /></td>
                    <td className="td"><NextStep status={o.status} /></td>
                    <td className="td">{dv?.d ? <>{dv.d.name}<div className="text-[11px] text-ink-soft">{dv.v?.reg}</div></> : <span className="text-ink-soft">—</span>}</td>
                    <td className="td text-ink-soft">{dateTime(o.createdAt)}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-sm text-ink-soft">{filter === 'action' ? 'Nothing needs your action right now.' : 'No orders here.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      {openId && <OrderDetail id={openId} onClose={() => setParams({})} />}
    </div>
  );
}

function HowSteps() {
  const steps = [
    ['Customer orders & pays', 'Customer App'],
    ['1 · Confirm order', 'You'],
    ['2 · Assign driver (+ their truck)', 'You'],
    ['Accept → Start → Deliver with code', 'Driver App'],
  ];
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2.5 text-[12px] shadow-card">
      {steps.map(([t, who], i) => (
        <span key={t} className="flex items-center gap-1.5">
          <span className={clsx('rounded-full px-2.5 py-1 font-semibold', who === 'You' ? 'bg-brand-primary text-white' : 'bg-surface-secondary text-ink')}>{t}<span className={clsx('ml-1 font-normal', who === 'You' ? 'text-brand-accent' : 'text-ink-soft')}>· {who}</span></span>
          {i < steps.length - 1 && <ChevronRight size={13} className="text-ink-soft" />}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
const NEXT: Partial<Record<Order['status'], { label: string; mine: boolean }>> = {
  awaiting_payment: { label: 'Waiting for customer to pay', mine: false },
  payment_verification: { label: 'Check receipt & confirm', mine: true },
  awaiting_confirmation: { label: 'Confirm order', mine: true },
  confirmed: { label: 'Assign a driver', mine: true },
  assigned: { label: 'Driver to accept', mine: false },
  out_for_delivery: { label: 'Driver delivering', mine: false },
  partially_delivered: { label: 'Decide: refund or redeliver', mine: true },
  delivery_failed: { label: 'Decide: refund or redeliver', mine: true },
};
function NextStep({ status }: { status: Order['status'] }) {
  const n = NEXT[status];
  if (!n) return <span className="text-ink-soft">—</span>;
  return <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap text-[12px] font-semibold', n.mine ? 'text-brand-secondary' : 'text-ink-soft')}>{n.mine && <ChevronRight size={13} />}{n.label}</span>;
}

function FlowStrip({ status }: { status: Order['status'] }) {
  if (status === 'cancelled') return null;
  const after = (list: Order['status'][]) => list.includes(status);
  const steps = [
    { label: '1 · Confirm order', done: after(['confirmed', 'assigned', 'out_for_delivery', 'delivered', 'partially_delivered', 'delivery_failed', 'completed']) },
    { label: '2 · Assign driver', done: after(['assigned', 'out_for_delivery', 'delivered', 'partially_delivered', 'delivery_failed', 'completed']) },
    { label: 'Driver accepts & starts', done: after(['out_for_delivery', 'delivered', 'partially_delivered', 'delivery_failed', 'completed']) },
    { label: 'Delivered with code', done: after(['delivered', 'partially_delivered', 'completed']) },
  ];
  const current = steps.findIndex((s) => !s.done);
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      {steps.map((s, i) => (
        <span key={s.label} className="flex items-center gap-1.5">
          <span className={clsx('rounded-full px-2.5 py-1 text-[11.5px] font-semibold', s.done ? 'bg-status-success/10 text-status-success' : i === current ? 'bg-brand-primary text-white' : 'bg-surface-secondary text-ink-soft')}>
            {s.done && '✓ '}{s.label}
          </span>
          {i < steps.length - 1 && <ChevronRight size={13} className="text-ink-soft" />}
        </span>
      ))}
    </div>
  );
}

function OrderDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const db = useDb();
  const { adminCancelOrder, resolveException } = useStore.getState();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  useEffect(() => { setCancelling(false); }, [id]);
  const o = db.orders.find((x) => x.id === id);
  if (!o) return null;
  const c = db.customers.find((x) => x.id === o.customerId)!;
  const p = db.payments.find((x) => x.id === o.paymentId)!;
  const dv = driverOf(db, o);
  const stop = dv?.t.stops.find((s) => s.orderId === o.id);
  const canCancel = ['awaiting_payment', 'payment_verification', 'awaiting_confirmation', 'confirmed'].includes(o.status);

  return (
    <Modal open onClose={onClose} title={`Order ${o.id} · ${c.name} · ${litres(o.qty)}`} wide>
      <FlowStrip status={o.status} />

      {/* ---- The one thing to do now ---- */}
      {o.status === 'awaiting_payment' && <Callout tone="info" title="Waiting for the customer to pay">Nothing to do yet. Once the customer pays by card, or uploads a transfer receipt, you can confirm the order here.</Callout>}
      {(o.status === 'payment_verification' || o.status === 'awaiting_confirmation') && <ConfirmPanel orderId={o.id} />}
      {o.status === 'confirmed' && <AssignPanel orderId={o.id} />}
      {o.status === 'assigned' && <OnTrip orderId={o.id} />}
      {o.status === 'out_for_delivery' && dv && (
        <Callout tone="info" title={`On the road with ${dv.d?.name} · ${dv.v?.reg}`}>The driver delivers and enters the customer’s 4-digit code. Follow it on <Link to="/admin/tracking" className="font-semibold underline">Live Tracking</Link>.</Callout>
      )}
      {(o.status === 'partially_delivered' || o.status === 'delivery_failed') && (
        <Card title="Decide what happens to the rest" className="border-status-warning/40">
          <p className="mb-3 text-[13px] text-ink-soft"><b>{litres(o.qty - (o.deliveredQty ?? 0))}</b> was not delivered{o.outcomeReason && <> ({o.outcomeReason})</>}.</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { if (resolveException(o.id, 'reschedule').ok) ok('New delivery created for the rest — assign a driver to it'); }}>Deliver the rest later</Button>
            <Button variant="outline" onClick={() => { if (resolveException(o.id, 'refund').ok) ok('Refund sent to Payments'); }}>Refund the rest</Button>
          </div>
        </Card>
      )}
      {['delivered', 'completed'].includes(o.status) && <Callout tone="info" title="Done">Delivered {litres(o.deliveredQty ?? o.qty)}{stop?.pod && <> · confirmed with the customer’s code at {dateTime(stop.pod.at)}</>}.</Callout>}

      {canCancel && !cancelling && <button onClick={() => setCancelling(true)} className="mt-2 text-[12.5px] font-semibold text-status-error hover:underline">Cancel this order…</button>}
      {cancelling && (
        <Card title="Cancel order" className="mt-3">
          <Field label="Reason (saved in the audit log)"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer asked by phone" /></Field>
          <div className="mt-3 flex gap-2"><Button variant="danger" onClick={() => { if (adminCancelOrder(o.id, reason).ok) { ok('Order cancelled'); setCancelling(false); } }}>Cancel order</Button><Button variant="ghost" onClick={() => setCancelling(false)}>Back</Button></div>
        </Card>
      )}

      {/* ---- Details ---- */}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Card title="Customer & address">
          <KV k="Name" v={c.name} /><KV k="Phone" v={c.phone} /><KV k="Address" v={`${o.address.line}, ${o.address.area}`} />
          {o.address.instructions && <div className="mt-2 rounded-lg bg-surface-secondary p-2 text-[12px]">{o.address.instructions}</div>}
        </Card>
        <Card title="Order & payment">
          <KV k="Petrol (PMS)" v={`${litres(o.qty)} × ${naira(o.unitPrice)}`} /><KV k="Delivery fee" v={naira(o.deliveryFee)} /><KV k="Total" v={<b>{naira(o.total)}</b>} />
          <KV k="Paid by" v={p.method === 'card' ? 'Card' : 'Bank transfer'} /><KV k="Payment" v={<StatusBadge meta={paymentStatusMeta[p.status]} />} />
        </Card>
        <Card title="Delivery">
          <KV k="Driver" v={dv?.d?.name ?? '—'} /><KV k="Truck" v={dv?.v?.reg ?? '—'} /><KV k="Ordered" v={litres(o.qty)} />
          <KV k="Delivered" v={o.deliveredQty !== undefined ? litres(o.deliveredQty) : '—'} />
        </Card>
      </div>

      <details className="mt-4 rounded-xl border border-line bg-white p-4 shadow-card">
        <summary className="cursor-pointer text-sm font-semibold">History ({o.timeline.length} events)</summary>
        <ol className="relative mt-3 space-y-2.5 border-l-2 border-line pl-4">
          {o.timeline.map((t, i) => (
            <li key={i} className="relative text-[13px]">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-secondary ring-2 ring-white" />
              <span className="font-medium">{t.label}</span> <span className="text-ink-soft">· {t.by} · {dateTime(t.at)}</span>
            </li>
          ))}
        </ol>
      </details>
    </Modal>
  );
}

/** Step 1 — one click. A transfer receipt is checked and accepted in the same step. */
function ConfirmPanel({ orderId }: { orderId: string }) {
  const db = useDb();
  const confirmOrder = useStore((s) => s.confirmOrder);
  const o = db.orders.find((x) => x.id === orderId)!;
  const p = db.payments.find((x) => x.id === o.paymentId)!;
  const avail = availableStock(db);
  const receipt = p.status === 'verification_pending' || p.status === 'evidence_submitted';
  const checks: [string, boolean][] = [
    [p.status === 'verified' ? `Paid — ${p.method === 'card' ? 'card payment verified' : 'transfer verified'}` : `Transfer receipt uploaded: ${p.evidence ?? naira(p.amountSubmitted ?? 0)}`, p.status === 'verified' || receipt],
    [`Enough petrol: ${litres(avail)} available`, avail >= o.qty],
    [`${o.address.area} is in the delivery area`, db.settings.serviceAreas.includes(o.address.area)],
  ];
  return (
    <Card title={<span className="flex items-center gap-2"><Check size={15} className="text-brand-secondary" /> Step 1 — Confirm the order</span>} className="border-brand-secondary/40">
      <div className="space-y-1.5">
        {checks.map(([l, pass]) => (
          <div key={l} className={clsx('flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px]', pass ? 'bg-status-success/5' : 'bg-status-error/5')}>
            {pass ? <Check size={15} className="text-status-success" /> : <CircleAlert size={15} className="text-status-error" />}{l}
          </div>
        ))}
      </div>
      {receipt && <p className="mt-2 text-[12px] text-status-warning">Check that {naira(p.amountDue)} reached PAC’s bank account before confirming. Confirming also marks the payment as received.</p>}
      <Button className="mt-3" onClick={() => { if (confirmOrder(o.id).ok) ok(`${o.id} confirmed — now assign a driver`); }}>
        <Check size={15} /> {receipt ? 'Payment received — confirm order' : 'Confirm order'}
      </Button>
    </Card>
  );
}

/** Step 2 — pick a driver; their truck goes with them. */
function AssignPanel({ orderId }: { orderId: string }) {
  const db = useDb();
  const { assignOrderToDriver, loadTruck } = useStore.getState();
  const o = db.orders.find((x) => x.id === orderId)!;
  const drivers = db.drivers.filter((d) => !d.removed);

  function reasonNot(id: string): string {
    const d = db.drivers.find((x) => x.id === id)!;
    if (d.status !== 'active') return d.status.replace('_', ' ');
    if (db.trips.some((t) => t.driverId === d.id && t.status === 'in_transit')) return 'on the road';
    const v = db.vehicles.find((x) => x.id === d.vehicleId && !x.removed);
    if (!v) return 'no truck';
    if (!['available', 'assigned'].includes(v.status)) return `truck ${v.status}`;
    return '';
  }

  const [driverId, setDriverId] = useState(() => drivers.find((d) => !reasonNot(d.id))?.id ?? '');
  const d = drivers.find((x) => x.id === driverId);
  const v = d && db.vehicles.find((x) => x.id === d.vehicleId);
  const pending = d && db.trips.find((t) => t.driverId === d.id && ['assigned', 'acknowledged'].includes(t.status));
  const need = v ? truckCommitted(db, v.id) + o.qty : 0;
  const short = v ? Math.max(0, need - v.fuel) : 0;
  const why = d ? reasonNot(d.id) : '';

  return (
    <Card title={<span className="flex items-center gap-2"><UserRound size={15} className="text-brand-secondary" /> Step 2 — Assign a driver</span>} className="border-brand-secondary/40">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <Field label="Driver (their truck goes with them)">
          <select className="input" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">Select a driver…</option>
            {drivers.map((x) => {
              const r = reasonNot(x.id);
              const tv = db.vehicles.find((y) => y.id === x.vehicleId);
              return <option key={x.id} value={x.id} disabled={!!r}>{x.name} — {tv ? `${tv.reg} · ${litres(tv.fuel)} on board` : 'no truck'}{r ? ` (${r})` : ''}</option>;
            })}
          </select>
        </Field>
        <Button disabled={!d || !!why || short > 0} onClick={() => { const r = assignOrderToDriver(o.id, driverId); if (r.ok) ok(`${d!.name} assigned — it’s now in their Driver App`); }}><Truck size={15} /> Assign driver</Button>
      </div>

      {d && !why && v && (
        <div className="mt-3 rounded-lg bg-surface-secondary p-3 text-[12.5px]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span><Truck size={13} className="mr-1 inline text-brand-secondary" />Truck <b>{v.reg}</b></span>
            <span><Fuel size={13} className="mr-1 inline text-brand-secondary" /><b>{litres(v.fuel)}</b> on board · needs <b>{litres(need)}</b>{need > o.qty && ' (incl. their other deliveries)'}</span>
            {pending && <span className="text-ink-soft">Joins {d.name}’s next trip as stop {pending.stops.length + 1}</span>}
          </div>
          {short > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-status-warning">
              <CircleAlert size={14} /> Not enough fuel on the truck.
              <Button size="sm" variant="gold" onClick={() => { const add = Math.min(v.capacity - v.fuel, Math.max(short, 4000)); if (loadTruck(v.id, add).ok) ok(`${litres(add)} loaded into ${v.reg}`); }}><Fuel size={13} /> Load fuel into {v.reg} now</Button>
              <Link to="/admin/inventory" className="text-[12px] font-semibold underline">or go to Fuel & Inventory</Link>
            </div>
          )}
        </div>
      )}
      {d && why === 'no truck' && <p className="mt-2 text-[12.5px] text-status-warning">{d.name} has no truck. Give them one on the <Link to="/admin/drivers" className="font-semibold underline">Drivers</Link> page.</p>}
    </Card>
  );
}

function OnTrip({ orderId }: { orderId: string }) {
  const db = useDb();
  const remove = useStore((s) => s.removeOrderFromTrip);
  const o = db.orders.find((x) => x.id === orderId)!;
  const t = db.trips.find((x) => x.id === o.tripId)!;
  const d = db.drivers.find((x) => x.id === t.driverId)!;
  const v = db.vehicles.find((x) => x.id === t.vehicleId)!;
  return (
    <Card title={<span className="flex items-center gap-2"><Navigation size={15} className="text-brand-secondary" /> Assigned to {d.name} · {v.reg}</span>}>
      <p className="text-[13px]">{t.status === 'assigned' ? 'Waiting for the driver to accept it in the Driver App.' : 'The driver accepted it and will start the trip soon.'} {t.stops.length > 1 && <span className="text-ink-soft">({t.stops.length} deliveries on this trip.)</span>}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => { if (remove(o.id, '').ok) ok('Driver removed — you can assign someone else'); }}>Change driver</Button>
    </Card>
  );
}
