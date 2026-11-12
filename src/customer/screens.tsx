import { useMemo, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  Bell, ChevronLeft, ChevronRight, Copy, CreditCard, Landmark, MapPin, Minus, Plus, ShieldCheck, Truck, Upload, Headphones, Lock, Fuel, CheckCircle2, AlertTriangle, Clock, Plus as PlusIcon, ListOrdered,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { AREAS } from '../lib/seed';
import { dateTime, litres, naira, orderStatusMeta, paymentStatusMeta, ago } from '../lib/format';
import { gpsView, useNow } from '../lib/selectors';
import type { Address, Order, PaymentMethod } from '../lib/types';
import { Badge, StatusBadge, ok } from '../components/ui';
import { LagosMap } from '../components/LagosMap';
import type { Nav } from './CustomerApp';

// ---------------- shared bits ----------------
function useCustomer() {
  return useStore((s) => s.db.customers.find((c) => c.id === s.session.customerId)!);
}
function useMyOrders() {
  const id = useStore((s) => s.session.customerId);
  const orders = useStore((s) => s.db.orders);
  return useMemo(() => orders.filter((o) => o.customerId === id), [orders, id]);
}
const ACTIVE = (o: Order) => !['completed', 'cancelled', 'delivery_failed', 'partially_delivered'].includes(o.status);

function Top({ title, back, right, dark }: { title: string; back?: () => void; right?: ReactNode; dark?: boolean }) {
  return (
    <div className={clsx('sticky top-0 z-10 flex items-center gap-2 px-4 py-3', dark ? 'bg-brand-primary text-white' : 'border-b border-line bg-white')}>
      {back && <button onClick={back} className="-ml-1 rounded-full p-1 hover:bg-black/5" aria-label="Back"><ChevronLeft size={20} /></button>}
      <h1 className="flex-1 text-[15px] font-semibold">{title}</h1>
      {right}
    </div>
  );
}
const Section = ({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) => (
  <div className="px-4 pt-4">
    {title && <div className="mb-2 flex items-center justify-between"><h2 className="text-[13px] font-semibold text-ink">{title}</h2>{action}</div>}
    {children}
  </div>
);
const Box = ({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) => (
  <div onClick={onClick} className={clsx('rounded-2xl border border-line bg-white p-3.5', onClick && 'cursor-pointer active:scale-[.99]', className)}>{children}</div>
);
const Primary = ({ children, className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className={clsx('flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-3.5 text-[14px] font-semibold text-white transition active:scale-[.99] disabled:opacity-40', className)}>{children}</button>
);

function OrderRow({ o, onClick }: { o: Order; onClick: () => void }) {
  const p = useStore((s) => s.db.payments.find((x) => x.id === o.paymentId));
  return (
    <Box onClick={onClick} className="mb-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold">{o.id}</span>
        <StatusBadge meta={orderStatusMeta[o.status]} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[12px] text-ink-soft">
        <span>PMS · {litres(o.qty)} · {dateTime(o.createdAt)}</span>
        <span className="font-semibold text-ink">{naira(o.total)}</span>
      </div>
      {p && <div className="mt-1.5 text-[11px] text-ink-soft">Payment: <span className="font-medium">{paymentStatusMeta[p.status].label}</span></div>}
    </Box>
  );
}

// ---------------- HOME ----------------
export function HomeScreen({ nav }: { nav: Nav }) {
  const c = useCustomer();
  const st = useStore((s) => s.db.settings);
  const orders = useMyOrders();
  const unread = useStore((s) => s.db.notifications.filter((n) => n.audience === 'customer' && n.recipientId === c.id && !n.read).length);
  const active = orders.find(ACTIVE);
  const first = c.name.split(' ')[0];
  return (
    <div className="pb-4">
      <div className="bg-brand-primary px-4 pb-14 pt-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-accent text-[13px] font-bold text-brand-primary">{c.name.split(' ').map((x) => x[0]).join('')}</div>
            <div><div className="text-[11px] text-white/60">Good day,</div><div className="text-[15px] font-semibold">{first}</div></div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => nav({ name: 'profile', tab: 'support' })} className="rounded-full p-2 hover:bg-white/10" aria-label="Support"><Headphones size={18} /></button>
            <button onClick={() => nav({ name: 'notifications' })} className="relative rounded-full p-2 hover:bg-white/10" aria-label="Notifications">
              <Bell size={18} />{unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-accent" />}
            </button>
          </div>
        </div>
      </div>
      <div className="-mt-10 px-4">
        <div className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-line">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">Premium Motor Spirit (PMS)</div>
              <div className="mt-1 text-2xl font-bold">{naira(st.unitPrice)}<span className="text-sm font-medium text-ink-soft"> / litre</span></div>
            </div>
            {st.acceptingOrders ? <Badge tone="success">Accepting orders</Badge> : <Badge tone="error">Unavailable</Badge>}
          </div>
          <div className="mt-1 text-[11px] text-ink-soft">Delivery fee {naira(st.deliveryFee)} · {st.operatingHours}</div>
          <button onClick={() => nav({ name: 'order' })} disabled={!st.acceptingOrders} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-accent py-3.5 text-[15px] font-bold text-brand-primary shadow-sm disabled:opacity-40">
            <Fuel size={18} /> Order Petrol
          </button>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-surface-secondary px-3 py-2 text-[12px]">
            <MapPin size={14} className="text-brand-secondary" /><span className="flex-1 truncate">{c.addresses[0]?.label} · {c.addresses[0]?.line}, {c.addresses[0]?.area}</span>
          </div>
        </div>
      </div>

      {active ? (
        <Section title="Active order">
          <Box onClick={() => nav({ name: 'track', orderId: active.id })} className="border-brand-secondary/30">
            <div className="flex items-center justify-between"><span className="text-[13px] font-semibold">{active.id}</span><StatusBadge meta={orderStatusMeta[active.status]} /></div>
            <div className="mt-2 flex items-center justify-between text-[12px]"><span className="text-ink-soft">{litres(active.qty)} · {active.address.area}</span><span className="font-semibold">{naira(active.total)}</span></div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-brand-primary/5 px-3 py-2 text-[12px] font-semibold text-brand-secondary">
              {['awaiting_payment'].includes(active.status) ? 'Complete payment' : 'View details & track'} <ChevronRight size={16} />
            </div>
          </Box>
        </Section>
      ) : (
        <Section><Box className="text-center text-[12px] text-ink-soft">No active orders. Tap <b>Order Petrol</b> to get started.</Box></Section>
      )}

      <Section title="Quick access">
        <div className="grid grid-cols-3 gap-2">
          {[
            ['My Orders', ListOrdered, () => nav({ name: 'orders' })], ['Track', Truck, () => active ? nav({ name: 'track', orderId: active.id }) : nav({ name: 'orders' })],
            ['Addresses', MapPin, () => nav({ name: 'profile', tab: 'addresses' })], ['Payments', CreditCard, () => nav({ name: 'profile', tab: 'payments' })],
            ['Support', Headphones, () => nav({ name: 'profile', tab: 'support' })], ['Alerts', Bell, () => nav({ name: 'notifications' })],
          ].map(([l, I, fn]: any) => (
            <button key={l} onClick={fn} className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-white py-3 text-[11px] font-medium"><I size={18} className="text-brand-secondary" />{l}</button>
          ))}
        </div>
      </Section>

      <Section title="Recent orders" action={<button onClick={() => nav({ name: 'orders' })} className="text-[12px] font-semibold text-brand-secondary">See all</button>}>
        {orders.slice(0, 3).map((o) => <OrderRow key={o.id} o={o} onClick={() => nav({ name: 'track', orderId: o.id })} />)}
      </Section>
    </div>
  );
}

// ---------------- ORDER FLOW ----------------
export function OrderScreen({ nav }: { nav: Nav }) {
  const c = useCustomer();
  const st = useStore((s) => s.db.settings);
  const placeOrder = useStore((s) => s.placeOrder);
  const addAddress = useStore((s) => s.addAddress);
  const [step, setStep] = useState(1);
  const [qty, setQty] = useState(100);
  const [addrId, setAddrId] = useState(c.addresses[0]?.id ?? '');
  const [method, setMethod] = useState<PaymentMethod>(st.paymentMethods.card ? 'card' : 'bank_transfer');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(`req-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const addr = c.addresses.find((a) => a.id === addrId);
  const subtotal = qty * st.unitPrice;
  const total = subtotal + st.deliveryFee;
  const qtyErr = !Number.isInteger(qty) || qty < st.minOrder || qty > st.maxOrder ? `Enter ${st.minOrder}–${st.maxOrder.toLocaleString()} litres` : '';
  const areaOk = addr ? st.serviceAreas.includes(addr.area) : false;

  const submit = () => {
    setBusy(true);
    const r = placeOrder({ qty, addressId: addrId, method, requestId: requestId.current });
    setBusy(false);
    if (r.ok && r.id) { ok(`Order ${r.id} received`); nav({ name: 'pay', orderId: r.id }); }
  };

  return (
    <div className="pb-6">
      <Top title="Order Petrol" back={() => (step > 1 ? setStep(step - 1) : nav({ name: 'home' }))} right={<span className="text-[11px] font-medium text-ink-soft">Step {step} of 4</span>} />
      <div className="flex gap-1 px-4 pt-3">{[1, 2, 3, 4].map((i) => <div key={i} className={clsx('h-1 flex-1 rounded-full', i <= step ? 'bg-brand-secondary' : 'bg-line')} />)}</div>

      {step === 1 && (
        <Section title="How many litres?">
          <Box>
            <div className="flex items-center justify-between">
              <button onClick={() => setQty(Math.max(st.minOrder, qty - 5))} className="flex h-11 w-11 items-center justify-center rounded-full border border-line" aria-label="Decrease"><Minus size={18} /></button>
              <div className="text-center">
                <input type="number" inputMode="numeric" value={Number.isNaN(qty) ? '' : qty} onChange={(e) => setQty(parseInt(e.target.value || '0', 10))} className="w-28 bg-transparent text-center text-3xl font-bold focus:outline-none" aria-label="Litres" />
                <div className="text-[11px] text-ink-soft">litres</div>
              </div>
              <button onClick={() => setQty(Math.min(st.maxOrder, qty + 5))} className="flex h-11 w-11 items-center justify-center rounded-full border border-line" aria-label="Increase"><Plus size={18} /></button>
            </div>
            {qtyErr && <div className="mt-2 text-center text-[12px] font-medium text-status-error">{qtyErr}</div>}
          </Box>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {st.presets.map((p) => (
              <button key={p} onClick={() => setQty(p)} className={clsx('rounded-xl border py-2.5 text-[13px] font-semibold', qty === p ? 'border-brand-secondary bg-brand-secondary text-white' : 'border-line bg-white')}>{p.toLocaleString()} L</button>
            ))}
          </div>
          <Box className="mt-3 space-y-1.5 text-[13px]">
            <div className="flex justify-between"><span className="text-ink-soft">{litres(qty || 0)} × {naira(st.unitPrice)}</span><span>{naira(subtotal || 0)}</span></div>
            <div className="flex justify-between"><span className="text-ink-soft">Delivery fee</span><span>{naira(st.deliveryFee)}</span></div>
            <div className="flex justify-between border-t border-line pt-1.5 font-bold"><span>Estimated total</span><span>{naira(total || 0)}</span></div>
            <div className="text-[10.5px] text-ink-soft">Price confirmed by PAC Petrol at checkout.</div>
          </Box>
          <Primary className="mt-4" disabled={!!qtyErr} onClick={() => setStep(2)}>Continue</Primary>
        </Section>
      )}

      {step === 2 && (
        <Section title="Where should we deliver?">
          {c.addresses.map((a) => {
            const inArea = st.serviceAreas.includes(a.area);
            return (
              <Box key={a.id} onClick={() => setAddrId(a.id)} className={clsx('mb-2', addrId === a.id && 'border-brand-secondary ring-1 ring-brand-secondary')}>
                <div className="flex items-start gap-2.5">
                  <MapPin size={16} className="mt-0.5 text-brand-secondary" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-[13px] font-semibold">{a.label}{!inArea && <Badge tone="error">Outside service area</Badge>}</div>
                    <div className="text-[12px] text-ink-soft">{a.line}, {a.area}</div>
                    {a.instructions && <div className="mt-1 text-[11px] italic text-ink-soft">“{a.instructions}”</div>}
                  </div>
                </div>
              </Box>
            );
          })}
          {adding ? <AddAddress onDone={(id) => { setAdding(false); if (id) setAddrId(id); }} add={addAddress} /> : (
            <button onClick={() => setAdding(true)} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-secondary/50 py-3 text-[13px] font-semibold text-brand-secondary"><PlusIcon size={15} /> Add new address</button>
          )}
          {addr && !areaOk && <div className="mt-3 rounded-lg bg-status-error/10 p-2.5 text-[12px] text-status-error">{addr.area} is outside our current delivery area — we can’t accept this order yet.</div>}
          <Primary className="mt-4" disabled={!addr} onClick={() => setStep(3)}>Continue</Primary>
        </Section>
      )}

      {step === 3 && (
        <Section title="Payment method">
          {([
            ['card', CreditCard, 'Card / online payment', 'Pay securely via payment gateway — confirmed instantly'],
            ['bank_transfer', Landmark, 'Bank transfer', 'Transfer to PAC’s account; Finance verifies before confirmation'],
          ] as const).filter(([k]) => st.paymentMethods[k]).map(([k, I, t, d]) => (
            <Box key={k} onClick={() => setMethod(k)} className={clsx('mb-2', method === k && 'border-brand-secondary ring-1 ring-brand-secondary')}>
              <div className="flex items-center gap-3"><I size={20} className="text-brand-secondary" /><div><div className="text-[13px] font-semibold">{t}</div><div className="text-[11.5px] text-ink-soft">{d}</div></div></div>
            </Box>
          ))}
          <div className="mt-2 rounded-lg bg-surface-secondary p-2.5 text-[11px] text-ink-soft">Payment on delivery is not available. <span className="italic">(Pending management approval.)</span></div>
          <Primary className="mt-4" onClick={() => setStep(4)}>Review order</Primary>
        </Section>
      )}

      {step === 4 && addr && (
        <Section title="Review & confirm">
          <Box className="space-y-1.5 text-[13px]">
            {[['Product', 'Premium Motor Spirit (PMS)'], ['Quantity', litres(qty)], ['Price per litre', naira(st.unitPrice)], ['Petrol subtotal', naira(subtotal)], ['Delivery fee', naira(st.deliveryFee)]].map(([k, v]) => (
              <div key={k} className="flex justify-between"><span className="text-ink-soft">{k}</span><span className="font-medium">{v}</span></div>
            ))}
            <div className="flex justify-between border-t border-line pt-2 text-[15px] font-bold"><span>Total payable</span><span>{naira(total)}</span></div>
          </Box>
          <Box className="mt-2 space-y-1.5 text-[13px]">
            <div className="flex justify-between gap-3"><span className="text-ink-soft">Deliver to</span><span className="text-right font-medium">{addr.label} · {addr.line}, {addr.area}</span></div>
            <div className="flex justify-between"><span className="text-ink-soft">Delivery</span><span className="font-medium">As soon as operationally possible</span></div>
            <div className="flex justify-between"><span className="text-ink-soft">Payment</span><span className="font-medium">{method === 'card' ? 'Card / online' : 'Bank transfer'}</span></div>
          </Box>
          <div className="mt-3 flex gap-2 text-[11px] text-ink-soft"><ShieldCheck size={14} className="shrink-0 text-brand-secondary" />Your order is “Received” first. It’s confirmed only after payment and stock checks — we never promise delivery we can’t make.</div>
          <Primary className="mt-4 bg-brand-accent text-brand-primary" disabled={busy} onClick={submit}>{busy ? 'Placing order…' : `Place order · ${naira(total)}`}</Primary>
        </Section>
      )}
    </div>
  );
}

function AddAddress({ onDone, add }: { onDone: (id?: string) => void; add: (a: Omit<Address, 'id' | 'pos'>) => { ok: boolean; id?: string } }) {
  const [f, setF] = useState({ label: 'Home', kind: 'home' as Address['kind'], line: '', area: 'Yaba', landmark: '', instructions: '' });
  return (
    <Box className="space-y-2">
      <div className="text-[13px] font-semibold">New address</div>
      <div className="flex items-center gap-2 rounded-lg bg-brand-primary/5 px-2.5 py-2 text-[11px] text-brand-secondary"><MapPin size={13} /> Use my current location (GPS) · or drop a pin on the map</div>
      <div className="grid grid-cols-2 gap-2">
        <input className="input" placeholder="Label" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
        <select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Address['kind'] })}>{['home', 'office', 'business', 'other'].map((k) => <option key={k}>{k}</option>)}</select>
      </div>
      <input className="input" placeholder="Street & house number" value={f.line} onChange={(e) => setF({ ...f, line: e.target.value })} />
      <select className="input" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })}>{Object.keys(AREAS).map((a) => <option key={a}>{a}</option>)}</select>
      <input className="input" placeholder="Landmark (optional)" value={f.landmark} onChange={(e) => setF({ ...f, landmark: e.target.value })} />
      <input className="input" placeholder="Delivery instructions (optional)" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} />
      <div className="flex gap-2">
        <button className="flex-1 rounded-lg border border-line py-2 text-[13px]" onClick={() => onDone()}>Cancel</button>
        <button className="flex-1 rounded-lg bg-brand-primary py-2 text-[13px] font-semibold text-white disabled:opacity-40" disabled={!f.line.trim()} onClick={() => { const r = add(f); onDone(r.id); }}>Save</button>
      </div>
      <div className="text-[10.5px] text-ink-soft">Tip: choose “Badagry” to see the out-of-service-area check.</div>
    </Box>
  );
}

// ---------------- PAY ----------------
export function PayScreen({ nav, orderId }: { nav: Nav; orderId: string }) {
  const o = useStore((s) => s.db.orders.find((x) => x.id === orderId));
  const p = useStore((s) => (o ? s.db.payments.find((x) => x.id === o.paymentId) : undefined));
  const payWithCard = useStore((s) => s.payWithCard);
  const submitEvidence = useStore((s) => s.submitTransferEvidence);
  const [processing, setProcessing] = useState(false);
  const [amount, setAmount] = useState(o?.total ?? 0);
  const [bankRef, setBankRef] = useState('');
  const [file, setFile] = useState<string>('');
  if (!o || !p) return null;
  const copy = (t: string) => { navigator.clipboard?.writeText(t); ok('Copied'); };

  if (p.status === 'verified' || p.status === 'verification_pending') {
    return (
      <div className="pb-6">
        <Top title="Payment" back={() => nav({ name: 'home' })} />
        <div className="px-6 pt-10 text-center">
          <div className={clsx('mx-auto flex h-16 w-16 items-center justify-center rounded-full', p.status === 'verified' ? 'bg-status-success/10 text-status-success' : 'bg-status-warning/10 text-status-warning')}>
            {p.status === 'verified' ? <CheckCircle2 size={34} /> : <Clock size={34} />}
          </div>
          <h2 className="mt-4 text-lg font-bold">{p.status === 'verified' ? 'Payment confirmed' : 'Payment verification pending'}</h2>
          <p className="mt-2 text-[13px] text-ink-soft">
            {p.status === 'verified' ? `${naira(p.amountDue)} received for ${o.id}. PAC Petrol is now running final checks before confirming your order.` : `We’ve received your transfer evidence. Our finance team will confirm the money has arrived — a receipt upload alone doesn’t confirm payment.`}
          </p>
          <Primary className="mt-6" onClick={() => nav({ name: 'track', orderId: o.id })}>View order status</Primary>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <Top title={`Pay for ${o.id}`} back={() => nav({ name: 'track', orderId: o.id })} />
      <Section>
        <Box className="text-center">
          <div className="text-[12px] text-ink-soft">Amount payable</div>
          <div className="text-3xl font-bold">{naira(o.total)}</div>
          <div className="mt-1 text-[11px] text-ink-soft">{litres(o.qty)} PMS · delivery to {o.address.area}</div>
          {(p.status === 'failed' || p.status === 'rejected') && <div className="mt-2 rounded-lg bg-status-error/10 p-2 text-[12px] text-status-error">{p.status === 'failed' ? 'Your last attempt failed. Your order is saved — please try again.' : `Previous evidence rejected: ${p.rejectReason}`}</div>}
        </Box>
      </Section>

      {o.paymentMethod === 'card' ? (
        <Section title="Secure checkout">
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="flex items-center justify-between bg-[#011B33] px-4 py-2.5 text-[12px] font-semibold text-white"><span className="flex items-center gap-1.5"><Lock size={13} /> Payment gateway</span><span className="text-white/60">simulated</span></div>
            <div className="space-y-2 p-4">
              <input className="input" defaultValue="4084 0840 8408 4081" aria-label="Card number" />
              <div className="grid grid-cols-2 gap-2"><input className="input" defaultValue="12/28" aria-label="Expiry" /><input className="input" defaultValue="408" aria-label="CVV" /></div>
              <Primary disabled={processing} onClick={() => { setProcessing(true); setTimeout(() => { payWithCard(o.id, true); setProcessing(false); }, 1200); }}>{processing ? 'Authorising…' : `Pay ${naira(o.total)}`}</Primary>
              <button disabled={processing} onClick={() => payWithCard(o.id, false)} className="w-full py-1 text-[12px] font-medium text-status-error">Simulate a declined card</button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-ink-soft">The app never decides a payment succeeded. PAC’s server confirms it via the gateway’s signed webhook.</p>
        </Section>
      ) : (
        <Section title="Transfer to PAC Petrol">
          <Box className="space-y-2 text-[13px]">
            {[['Account name', 'PAC Petrol Limited'], ['Bank', 'Demo Bank Plc'], ['Account number', '0123456789'], ['Amount', naira(o.total)], ['Reference', p.reference]].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between"><span className="text-ink-soft">{k}</span><span className="flex items-center gap-1.5 font-semibold">{v}{['Account number', 'Reference'].includes(k) && <button onClick={() => copy(v)} aria-label={`Copy ${k}`}><Copy size={13} className="text-brand-secondary" /></button>}</span></div>
            ))}
            <div className="rounded-lg bg-[#fbf7ec] p-2 text-[11px] text-brand-accent-deep">Use the reference exactly so Finance can match your transfer.</div>
          </Box>
          <Box className="mt-2 space-y-2">
            <div className="text-[13px] font-semibold">I’ve made the transfer</div>
            <input className="input" type="number" value={amount} onChange={(e) => setAmount(+e.target.value)} aria-label="Amount transferred" />
            <input className="input" placeholder="Bank transaction reference" value={bankRef} onChange={(e) => setBankRef(e.target.value)} />
            <button onClick={() => setFile('transfer-receipt.jpg')} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line py-3 text-[12px] text-ink-soft"><Upload size={15} />{file || 'Upload receipt (photo or PDF)'}</button>
            <Primary disabled={!file || !amount} onClick={() => submitEvidence(o.id, amount, bankRef)}>Submit for verification</Primary>
          </Box>
        </Section>
      )}
    </div>
  );
}

// ---------------- TRACK / ORDER DETAIL ----------------
const EXPLAIN: Partial<Record<Order['status'], { tone: 'warning' | 'error' | 'info'; text: string }>> = {
  awaiting_payment: { tone: 'warning', text: 'Complete payment so PAC Petrol can confirm your order.' },
  payment_verification: { tone: 'info', text: 'Finance is confirming your transfer. You’ll be notified when it’s verified.' },
  awaiting_confirmation: { tone: 'info', text: 'Payment received. We’re checking stock and delivery feasibility before confirming.' },
  partially_delivered: { tone: 'warning', text: 'Only part of your order was delivered. Our team will contact you about the outstanding quantity — redelivery or refund, per PAC policy.' },
  delivery_failed: { tone: 'error', text: 'We couldn’t complete your delivery. Your order has NOT been cancelled — support will contact you with next steps.' },
  cancelled: { tone: 'warning', text: 'This order was cancelled. Any verified payment will be refunded.' },
};

export function TrackScreen({ nav, orderId }: { nav: Nav; orderId: string }) {
  const now = useNow(1000);
  const db = useStore((s) => s.db);
  const customerCancel = useStore((s) => s.customerCancel);
  const o = db.orders.find((x) => x.id === orderId);
  if (!o) return null;
  const p = db.payments.find((x) => x.id === o.paymentId)!;
  const trip = o.tripId ? db.trips.find((t) => t.id === o.tripId) : undefined;
  const driver = trip && db.drivers.find((d) => d.id === trip.driverId);
  const vehicle = trip && db.vehicles.find((v) => v.id === trip.vehicleId);
  const myStop = trip?.stops.find((s) => s.orderId === o.id);
  const stopsBefore = trip && myStop ? trip.stops.filter((s) => s.seq < myStop.seq && s.status === 'pending').length : 0;
  const tracking = trip && trip.status === 'in_transit' && myStop && myStop.status === 'pending';
  const gv = trip ? gpsView(trip, db.settings.gpsStaleAfterSec, now) : undefined;
  const dist = trip ? Math.hypot(trip.gps.pos.x - o.address.pos.x, trip.gps.pos.y - o.address.pos.y) : 0;
  const eta = Math.max(1, Math.round(dist / 16 + stopsBefore * 12));
  const ex = EXPLAIN[o.status];
  const canCancel = ['awaiting_payment', 'payment_verification', 'awaiting_confirmation', 'confirmed'].includes(o.status);

  return (
    <div className="pb-6">
      <Top title={o.id} back={() => nav({ name: 'orders' })} right={<StatusBadge meta={orderStatusMeta[o.status]} />} />

      {tracking && trip && (
        <div className="px-4 pt-3">
          <LagosMap
            className="h-48"
            showLabels={false}
            showDepot={false}
            vehicles={[{ id: trip.id, label: 'Your tanker', pos: trip.gps.pos, live: !!gv?.live, caption: gv?.live ? undefined : `Last known · ${ago(trip.gps.updatedAt, now)}` }]}
            pins={[{ id: o.id, pos: o.address.pos, tone: 'brand', label: 'You' }]}
          />
          <div className="mt-2 flex items-center justify-between rounded-xl bg-brand-primary px-3.5 py-2.5 text-white">
            <div>
              <div className="text-[11px] text-white/60">{gv?.live ? 'Estimated arrival' : 'Location update delayed'}</div>
              <div className="text-[15px] font-bold">{gv?.live ? `~${eta} min (estimate)` : 'ETA unavailable'}</div>
            </div>
            <div className="text-right text-[11px] text-white/70">{stopsBefore > 0 ? `${stopsBefore} delivery before yours` : 'You’re next'}</div>
          </div>
          {!gv?.live && <div className="mt-1.5 text-[11px] text-status-warning">GPS signal lost — showing last confirmed position. Your order status is unaffected.</div>}
        </div>
      )}

      {(o.status === 'out_for_delivery' || o.status === 'assigned') && (
        <Section>
          <div className="rounded-2xl border-2 border-dashed border-brand-accent bg-[#fbf7ec] p-4 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-accent-deep">Your delivery code</div>
            <div className="mt-1 text-3xl font-extrabold tracking-[0.4em] text-brand-primary">{o.deliveryOtp}</div>
            <div className="mt-1 text-[11px] text-ink-soft">Share only after the petrol has been dispensed and you’ve checked the quantity.</div>
          </div>
        </Section>
      )}

      {ex && <Section><div className={clsx('flex gap-2 rounded-xl p-3 text-[12px]', ex.tone === 'error' ? 'bg-status-error/10 text-status-error' : ex.tone === 'warning' ? 'bg-status-warning/10 text-status-warning' : 'bg-status-info/10 text-status-info')}><AlertTriangle size={15} className="shrink-0" />{ex.text}</div></Section>}

      {o.status === 'awaiting_payment' && <Section><Primary onClick={() => nav({ name: 'pay', orderId: o.id })}>Complete payment · {naira(o.total)}</Primary></Section>}

      {(o.deliveredQty !== undefined) && (
        <Section title="Delivery result">
          <Box className="grid grid-cols-3 text-center text-[12px]">
            <div><div className="text-ink-soft">Ordered</div><div className="text-[15px] font-bold">{litres(o.qty)}</div></div>
            <div><div className="text-ink-soft">Delivered</div><div className="text-[15px] font-bold text-status-success">{litres(o.deliveredQty)}</div></div>
            <div><div className="text-ink-soft">Outstanding</div><div className={clsx('text-[15px] font-bold', o.qty - o.deliveredQty > 0 && 'text-status-warning')}>{litres(o.qty - o.deliveredQty)}</div></div>
          </Box>
        </Section>
      )}

      {driver && vehicle && (
        <Section title="Your driver">
          <Box className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-[13px] font-bold text-brand-accent">{driver.name.split(' ').map((x) => x[0]).join('')}</div>
            <div className="flex-1 text-[12px]"><div className="text-[13px] font-semibold">{driver.name}</div><div className="text-ink-soft">PMS Tanker · {vehicle.reg}</div></div>
            <Truck size={18} className="text-brand-secondary" />
          </Box>
        </Section>
      )}

      <Section title="Order progress">
        <Box>
          <ol className="relative space-y-3 border-l-2 border-line pl-4">
            {o.timeline.map((t, i) => (
              <li key={i} className="relative">
                <span className={clsx('absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white', i === o.timeline.length - 1 ? 'bg-brand-accent' : 'bg-brand-secondary')} />
                <div className="text-[12.5px] font-medium">{t.label}</div>
                <div className="text-[10.5px] text-ink-soft">{dateTime(t.at)}</div>
              </li>
            ))}
          </ol>
          <div className="mt-3 text-[10.5px] text-ink-soft">Only events confirmed by PAC Petrol’s system appear here.</div>
        </Box>
      </Section>

      <Section title="Details">
        <Box className="space-y-1.5 text-[12.5px]">
          {[['Product', 'PMS'], ['Quantity', litres(o.qty)], ['Unit price (locked)', naira(o.unitPrice)], ['Delivery fee', naira(o.deliveryFee)], ['Total', naira(o.total)], ['Address', `${o.address.line}, ${o.address.area}`], ['Payment', `${p.method === 'card' ? 'Card' : 'Bank transfer'} · ${paymentStatusMeta[p.status].label}`]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3"><span className="text-ink-soft">{k}</span><span className="text-right font-medium">{v}</span></div>
          ))}
          {p.refund && <div className="flex justify-between gap-3"><span className="text-ink-soft">Refund</span><span className="text-right font-medium">{naira(p.refund.amount)} · {p.refund.status}</span></div>}
        </Box>
      </Section>

      <Section>
        <div className="flex gap-2">
          <button onClick={() => nav({ name: 'profile', tab: 'support' })} className="flex-1 rounded-xl border border-line bg-white py-2.5 text-[12.5px] font-semibold">Report a problem</button>
          {canCancel && <button onClick={() => { if (confirm(`Cancel ${o.id}?`)) customerCancel(o.id); }} className="flex-1 rounded-xl border border-status-error/40 bg-white py-2.5 text-[12.5px] font-semibold text-status-error">Cancel order</button>}
        </div>
      </Section>
    </div>
  );
}

// ---------------- ORDERS ----------------
export function OrdersScreen({ nav }: { nav: Nav }) {
  const orders = useMyOrders();
  const [tab, setTab] = useState<'active' | 'completed' | 'partial' | 'failed' | 'cancelled'>('active');
  const filt = {
    active: orders.filter(ACTIVE),
    completed: orders.filter((o) => o.status === 'completed'),
    partial: orders.filter((o) => o.status === 'partially_delivered'),
    failed: orders.filter((o) => o.status === 'delivery_failed'),
    cancelled: orders.filter((o) => o.status === 'cancelled'),
  };
  return (
    <div className="pb-6">
      <Top title="My Orders" />
      <div className="flex gap-1.5 overflow-x-auto px-4 pt-3 scroll-thin">
        {(Object.keys(filt) as (keyof typeof filt)[]).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={clsx('whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium capitalize', tab === k ? 'bg-brand-primary text-white' : 'border border-line bg-white')}>{k} ({filt[k].length})</button>
        ))}
      </div>
      <Section>
        {filt[tab].length ? filt[tab].map((o) => <OrderRow key={o.id} o={o} onClick={() => nav({ name: 'track', orderId: o.id })} />) : <Box className="text-center text-[12px] text-ink-soft">No orders here.</Box>}
      </Section>
    </div>
  );
}

// ---------------- NOTIFICATIONS ----------------
export function NotificationsScreen({ nav }: { nav: Nav }) {
  const id = useStore((s) => s.session.customerId);
  const all = useStore((s) => s.db.notifications);
  const markRead = useStore((s) => s.markRead);
  const list = all.filter((n) => n.audience === 'customer' && n.recipientId === id);
  return (
    <div className="pb-6">
      <Top title="Notifications" right={<button onClick={() => markRead('customer', id)} className="text-[12px] font-semibold text-brand-secondary">Mark all read</button>} />
      <Section>
        {list.length === 0 && <Box className="text-center text-[12px] text-ink-soft">You’re all caught up.</Box>}
        {list.map((n) => {
          const oid = n.message.match(/PAC-\d+/)?.[0];
          return (
            <Box key={n.id} className={clsx('mb-2', !n.read && 'border-brand-accent/60 bg-[#fffdf7]')} onClick={oid ? () => nav({ name: 'track', orderId: oid }) : undefined}>
              <div className="flex items-start justify-between gap-2"><span className="text-[13px] font-semibold">{n.type}</span><span className="shrink-0 text-[10.5px] text-ink-soft">{ago(n.at)}</span></div>
              <div className="mt-0.5 text-[12px] text-ink/80">{n.message}</div>
            </Box>
          );
        })}
      </Section>
    </div>
  );
}

// ---------------- PROFILE / SUPPORT ----------------
export function ProfileScreen({ nav, initialTab }: { nav: Nav; initialTab?: 'support' | 'payments' | 'addresses' }) {
  const c = useCustomer();
  const db = useStore((s) => s.db);
  const submitComplaint = useStore((s) => s.submitComplaint);
  const [tab, setTab] = useState<'profile' | 'support' | 'payments' | 'addresses'>(initialTab ?? 'profile');
  const [cat, setCat] = useState('Delivery problem');
  const [orderId, setOrderId] = useState('');
  const [msg, setMsg] = useState('');
  const myOrders = db.orders.filter((o) => o.customerId === c.id);
  const myPayments = db.payments.filter((p) => p.customerId === c.id);
  const myComplaints = db.complaints.filter((x) => x.customerId === c.id);

  return (
    <div className="pb-6">
      <Top title="Profile" />
      <div className="flex gap-1.5 px-4 pt-3">
        {(['profile', 'addresses', 'payments', 'support'] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={clsx('flex-1 rounded-full py-1.5 text-[11.5px] font-medium capitalize', tab === k ? 'bg-brand-primary text-white' : 'border border-line bg-white')}>{k}</button>
        ))}
      </div>

      {tab === 'profile' && (
        <Section>
          <Box className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-[15px] font-bold text-brand-accent">{c.name.split(' ').map((x) => x[0]).join('')}</div>
            <div><div className="font-semibold">{c.name}</div><div className="text-[12px] text-ink-soft">{c.phone}</div><div className="text-[12px] text-ink-soft">{c.email}</div></div>
          </Box>
          <Box className="mt-2 space-y-1.5 text-[12.5px]">
            {[['Customer ID', c.id], ['Account', c.category], ['Phone verified', c.verified ? 'Yes (OTP)' : 'No'], ['Status', c.status], ['Member since', dateTime(c.registeredAt)]].map(([k, v]) => (
              <div key={k} className="flex justify-between"><span className="text-ink-soft">{k}</span><span className="font-medium capitalize">{v}</span></div>
            ))}
          </Box>
          <div className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white text-[13px]">
            {['Change password', 'Notification preferences', 'Terms & conditions', 'Privacy policy', 'Request account deletion', 'Log out'].map((x) => (
              <div key={x} className="flex items-center justify-between px-3.5 py-3"><span className={x === 'Log out' ? 'text-status-error' : ''}>{x}</span><ChevronRight size={15} className="text-ink-soft" /></div>
            ))}
          </div>
        </Section>
      )}

      {tab === 'addresses' && (
        <Section title="Saved addresses">
          {c.addresses.map((a, i) => (
            <Box key={a.id} className="mb-2">
              <div className="flex items-center gap-2 text-[13px] font-semibold">{a.label}{i === 0 && <Badge tone="brand">Default</Badge>}</div>
              <div className="text-[12px] text-ink-soft">{a.line}, {a.area}</div>
              {a.landmark && <div className="text-[11px] text-ink-soft">Landmark: {a.landmark}</div>}
            </Box>
          ))}
          <p className="text-[11px] text-ink-soft">Editing an address never changes the destination of an order that’s already confirmed.</p>
        </Section>
      )}

      {tab === 'payments' && (
        <Section title="Payment history">
          {myPayments.map((p) => (
            <Box key={p.id} className="mb-2">
              <div className="flex items-center justify-between"><span className="text-[13px] font-semibold">{naira(p.amountDue)}</span><StatusBadge meta={paymentStatusMeta[p.status]} /></div>
              <div className="mt-1 text-[11.5px] text-ink-soft">{p.reference} · {p.orderId} · {p.method === 'card' ? 'Card' : 'Transfer'} · {dateTime(p.createdAt)}</div>
              {p.status === 'verified' && <div className="mt-1.5 text-[11px] font-semibold text-brand-secondary">View official receipt →</div>}
            </Box>
          ))}
          <p className="text-[11px] text-ink-soft">Only verified payments are shown as successful.</p>
        </Section>
      )}

      {tab === 'support' && (
        <Section title="Contact support">
          <Box className="space-y-2">
            <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
              {['Delivery problem', 'Late delivery', 'Incorrect quantity', 'Payment issue', 'Refund request', 'Driver conduct', 'Other'].map((x) => <option key={x}>{x}</option>)}
            </select>
            <select className="input" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
              <option value="">Related order (optional)</option>
              {myOrders.map((o) => <option key={o.id} value={o.id}>{o.id} · {litres(o.qty)}</option>)}
            </select>
            <textarea className="input min-h-[80px]" placeholder="Describe the problem…" value={msg} onChange={(e) => setMsg(e.target.value)} />
            <Primary onClick={() => { const r = submitComplaint({ orderId: orderId || undefined, category: cat, message: msg }); if (r.ok) { ok(`Ticket ${r.id} submitted`); setMsg(''); } }}>Submit ticket</Primary>
          </Box>
          <div className="mb-2 mt-4 text-[13px] font-semibold">My tickets</div>
          {myComplaints.length === 0 && <Box className="text-center text-[12px] text-ink-soft">No tickets yet.</Box>}
          {myComplaints.map((x) => (
            <Box key={x.id} className="mb-2">
              <div className="flex items-center justify-between"><span className="text-[13px] font-semibold">{x.id} · {x.category}</span><Badge tone={x.status === 'resolved' || x.status === 'closed' ? 'success' : 'warning'}>{x.status.replace('_', ' ')}</Badge></div>
              <div className="mt-1 text-[12px] text-ink/80">{x.message}</div>
              {x.notes.filter((n) => !n.internal).map((n, i) => <div key={i} className="mt-1.5 rounded-lg bg-surface-secondary p-2 text-[11.5px]"><b>PAC Support:</b> {n.text}</div>)}
            </Box>
          ))}
        </Section>
      )}
    </div>
  );
}
