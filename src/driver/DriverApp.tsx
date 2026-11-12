import { useEffect, useMemo, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  Home, History, Bell, User, ChevronLeft, Navigation, Phone, MapPin, AlertOctagon, CheckCircle2, XCircle, Fuel, Lock, Play, PartyPopper, Truck,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { dateTime, litres, stopStatusMeta, tripStatusMeta, ago } from '../lib/format';
import type { Stop, Trip } from '../lib/types';
import { Badge, StatusBadge, ok } from '../components/ui';

type DScreen = { name: 'home' } | { name: 'stop'; tripId: string; stopId: string } | { name: 'history' } | { name: 'alerts' } | { name: 'profile' };

const PARTIAL_REASONS = ['Customer’s tank is full', 'Customer wanted less', 'Meter / equipment problem', 'Safety reason'];
const FAIL_REASONS = ['Customer not available', 'Wrong address', 'Couldn’t get access', 'Customer refused', 'Unsafe location', 'Truck problem'];

/**
 * Driver mobile app — kept to three actions:
 *   1. Accept the delivery   2. Start the trip   3. Deliver (litres + customer’s code)
 * The trip finishes by itself when every stop is done.
 */
export default function DriverApp() {
  const [screen, setScreen] = useState<DScreen>({ name: 'home' });
  const driverId = useStore((s) => s.session.driverId);
  const unread = useStore((s) => s.db.notifications.filter((n) => n.audience === 'driver' && n.recipientId === driverId && !n.read).length);
  const exists = useStore((s) => s.db.drivers.some((d) => d.id === s.session.driverId && !d.removed));
  const fallback = useStore((s) => s.db.drivers.find((d) => !d.removed)?.id);
  // If the signed-in driver was deleted by an admin, access is revoked — the demo switches to another driver.
  useEffect(() => { if (!exists && fallback) useStore.getState().setDriverSession(fallback); }, [exists, fallback]);
  if (!exists) return <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-ink-soft">This driver account was removed by PAC. App access revoked.</div>;

  const tabs = [
    { k: 'home', label: 'Home', icon: Home }, { k: 'history', label: 'History', icon: History },
    { k: 'alerts', label: 'Alerts', icon: Bell, badge: unread }, { k: 'profile', label: 'Profile', icon: User },
  ] as const;
  const activeTab = screen.name === 'stop' ? 'home' : screen.name;

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-surface-secondary scroll-thin">
        {screen.name === 'home' && <DHome nav={setScreen} />}
        {screen.name === 'stop' && <DStop nav={setScreen} tripId={screen.tripId} stopId={screen.stopId} />}
        {screen.name === 'history' && <DHistory />}
        {screen.name === 'alerts' && <DAlerts />}
        {screen.name === 'profile' && <DProfile />}
      </div>
      <nav className="grid grid-cols-4 border-t border-line bg-white px-1 pb-4 pt-1.5">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setScreen({ name: t.k } as DScreen)} className={clsx('relative flex flex-col items-center gap-0.5 py-1 text-[10px] font-semibold', activeTab === t.k ? 'text-brand-primary' : 'text-ink-soft')}>
            <t.icon size={21} strokeWidth={activeTab === t.k ? 2.4 : 1.8} />{t.label}
            {'badge' in t && t.badge > 0 && <span className="absolute right-5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-error px-1 text-[9px] font-bold text-white">{t.badge}</span>}
          </button>
        ))}
      </nav>
    </>
  );
}

// ---------- shared ----------
function useDriver() {
  return useStore((s) => s.db.drivers.find((d) => d.id === s.session.driverId)!);
}
function useMyTrips() {
  const id = useStore((s) => s.session.driverId);
  const trips = useStore((s) => s.db.trips);
  return useMemo(() => trips.filter((t) => t.driverId === id), [trips, id]);
}
const ACTIVE = (t: Trip) => !['completed', 'cancelled'].includes(t.status);
const Top = ({ title, back, right }: { title: string; back?: () => void; right?: ReactNode }) => (
  <div className="sticky top-0 z-10 flex items-center gap-2 bg-brand-primary px-4 py-3 text-white">
    {back && <button onClick={back} className="-ml-1 rounded-full p-1 hover:bg-white/10" aria-label="Back"><ChevronLeft size={22} /></button>}
    <h1 className="flex-1 text-[16px] font-bold">{title}</h1>{right}
  </div>
);
const Card = ({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) => (
  <div onClick={onClick} className={clsx('rounded-2xl border border-line bg-white p-4', onClick && 'cursor-pointer active:scale-[.99]', className)}>{children}</div>
);
const Big = ({ children, className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className={clsx('flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-4 text-[15px] font-bold text-white transition active:scale-[.99] disabled:opacity-40', className)}>{children}</button>
);
/** 1 Accept · 2 Start · 3 Deliver — always visible so the driver knows where they are. */
function Steps({ t }: { t?: Trip }) {
  const at = !t ? -1 : t.status === 'assigned' ? 0 : t.status === 'acknowledged' ? 1 : 2;
  return (
    <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-bold">
      {['1 Accept', '2 Start trip', '3 Deliver'].map((l, i) => (
        <div key={l} className={clsx('rounded-lg py-1.5', i < at ? 'bg-status-success/15 text-status-success' : i === at ? 'bg-brand-accent text-brand-primary' : 'bg-white/10 text-white/50')}>{i < at && '✓ '}{l}</div>
      ))}
    </div>
  );
}

// ---------- HOME: the whole job happens here ----------
function DHome({ nav }: { nav: (s: DScreen) => void }) {
  const d = useDriver();
  const db = useStore((s) => s.db);
  const { setDriverSession, acknowledgeTrip, startTrip, reportIncident } = useStore.getState();
  const trips = useMyTrips();
  const t = trips.find(ACTIVE);
  const v = db.vehicles.find((x) => x.id === (t?.vehicleId ?? d.vehicleId));
  const lastDone = trips.filter((x) => x.status === 'completed' && x.completedAt && Date.now() - x.completedAt < 3 * 3600_000).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))[0];
  const [incident, setIncident] = useState(false);
  const [incText, setIncText] = useState('');

  return (
    <div className="pb-4">
      <div className="bg-brand-primary px-4 pb-4 pt-3 text-white">
        <div className="flex items-center justify-between text-[11px] text-white/60">
          <span>Demo: signed in as</span>
          <select value={d.id} onChange={(e) => setDriverSession(e.target.value)} className="rounded bg-white/10 px-1.5 py-0.5 text-white">
            {db.drivers.filter((x) => !x.removed).map((x) => <option key={x.id} value={x.id} className="text-ink">{x.name}</option>)}
          </select>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent text-[15px] font-bold text-brand-primary">{d.name.split(' ').map((x) => x[0]).join('')}</div>
          <div className="min-w-0 flex-1"><div className="text-[17px] font-bold">{d.name}</div><div className="truncate text-[12px] text-white/65">{v ? `${v.reg} · ${litres(v.fuel)} on board` : 'No truck assigned yet'}</div></div>
        </div>
        {d.status !== 'active'
          ? <div className="mt-4 flex items-center gap-2 rounded-xl bg-status-error/20 p-3 text-[12.5px]"><Lock size={16} />Account {d.status.replace('_', ' ')} — you can’t receive deliveries until PAC activates it.</div>
          : <div className="mt-4"><Steps t={t} /></div>}
      </div>

      <div className="space-y-3 px-4 pt-4">
        {!t && (
          lastDone ? (
            <Card className="text-center">
              <PartyPopper size={28} className="mx-auto text-brand-accent-deep" />
              <div className="mt-2 text-[15px] font-bold">Trip finished</div>
              <div className="mt-1 text-[12.5px] text-ink-soft">{lastDone.stops.filter((s) => s.status === 'delivered').length} of {lastDone.stops.length} delivered · {litres(lastDone.stops.reduce((a, s) => a + (s.deliveredQty ?? 0), 0))}. {v && `${litres(v.fuel)} left on ${v.reg}.`}</div>
              <div className="mt-2 text-[11.5px] text-ink-soft">New deliveries will appear here.</div>
            </Card>
          ) : <Card className="text-center text-[13px] text-ink-soft">No deliveries yet. When PAC assigns you an order it appears here.</Card>
        )}

        {t && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold">{t.status === 'assigned' ? 'New delivery for you' : t.status === 'acknowledged' ? 'Ready to go' : 'Your deliveries'}</span>
              <StatusBadge meta={tripStatusMeta[t.status]} />
            </div>
            <Card className="grid grid-cols-3 gap-2 p-3 text-center text-[11px]">
              <div><div className="text-ink-soft">Stops</div><div className="text-[15px] font-bold">{t.stops.filter((s) => s.status !== 'pending').length}/{t.stops.length}</div></div>
              <div><div className="text-ink-soft">To deliver</div><div className="text-[15px] font-bold">{litres(t.allocatedQty)}</div></div>
              <div><div className="text-ink-soft">On truck</div><div className="text-[15px] font-bold">{litres(v?.fuel ?? 0)}</div></div>
            </Card>

            {t.stops.map((s) => <StopRow key={s.id} s={s} next={t.status === 'in_transit' && s.id === t.stops.find((x) => x.status === 'pending')?.id} onClick={t.status === 'in_transit' || s.status !== 'pending' ? () => nav({ name: 'stop', tripId: t.id, stopId: s.id }) : undefined} />)}

            {t.status === 'assigned' && <Big onClick={() => { if (acknowledgeTrip(t.id).ok) ok('Accepted'); }}><CheckCircle2 size={18} /> Accept delivery</Big>}
            {t.status === 'acknowledged' && (
              <>
                <Big onClick={() => { if (startTrip(t.id).ok) ok('Trip started — drive safely'); }}><Play size={18} /> Start trip</Big>
                <div className="text-center text-[11px] text-ink-soft"><Truck size={11} className="mr-1 inline" />Your location is shared with PAC and the customer while the trip is on.</div>
              </>
            )}
            {t.status === 'in_transit' && (() => {
              const next = t.stops.find((s) => s.status === 'pending');
              return next ? <Big onClick={() => nav({ name: 'stop', tripId: t.id, stopId: next.id })}><Navigation size={18} /> Go to stop {next.seq} & deliver</Big> : null;
            })()}

            {t.status === 'in_transit' && (incident ? (
              <Card className="space-y-2">
                <div className="text-[14px] font-bold text-status-error">Report a problem</div>
                <textarea className="input min-h-[70px]" placeholder="What happened?" value={incText} onChange={(e) => setIncText(e.target.value)} />
                <div className="flex gap-2"><button className="flex-1 rounded-xl border border-line py-2.5 text-[13px]" onClick={() => setIncident(false)}>Cancel</button><button className="flex-1 rounded-xl bg-status-error py-2.5 text-[13px] font-bold text-white" onClick={() => { if (reportIncident(t.id, 'Driver report', incText).ok) { ok('Sent to PAC operations'); setIncident(false); setIncText(''); } }}>Send</button></div>
                <div className="text-[10.5px] text-ink-soft">In an emergency, call emergency services first.</div>
              </Card>
            ) : <button onClick={() => setIncident(true)} className="flex w-full items-center justify-center gap-2 py-2 text-[12.5px] font-semibold text-status-error"><AlertOctagon size={15} /> Report a problem / unsafe situation</button>)}
          </>
        )}
      </div>
    </div>
  );
}

function StopRow({ s, onClick, next }: { s: Stop; onClick?: () => void; next?: boolean }) {
  const o = useStore((st) => st.db.orders.find((x) => x.id === s.orderId))!;
  const c = useStore((st) => st.db.customers.find((x) => x.id === o.customerId))!;
  return (
    <Card onClick={onClick} className={clsx('p-3', next && 'border-brand-accent ring-1 ring-brand-accent')}>
      <div className="flex items-start gap-3">
        <span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold', s.status === 'pending' ? 'bg-surface-secondary text-ink' : 'bg-brand-primary text-brand-accent')}>{s.seq}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2"><span className="truncate text-[13.5px] font-bold">{c.name}</span>{s.status === 'pending' ? (next ? <Badge tone="brand">Next</Badge> : null) : <StatusBadge meta={stopStatusMeta[s.status]} />}</div>
          <div className="truncate text-[12px] text-ink-soft">{o.address.line}, {o.address.area}</div>
          <div className="mt-1 text-[12px]"><b>{litres(s.orderedQty)}</b>{s.deliveredQty !== undefined && <> · delivered <b>{litres(s.deliveredQty)}</b></>}</div>
        </div>
      </div>
    </Card>
  );
}

// ---------- STOP: deliver with the customer's code ----------
function DStop({ nav, tripId, stopId }: { nav: (s: DScreen) => void; tripId: string; stopId: string }) {
  const db = useStore((s) => s.db);
  const { completeStop, failStop } = useStore.getState();
  const t = db.trips.find((x) => x.id === tripId)!;
  const s = t.stops.find((x) => x.id === stopId)!;
  const o = db.orders.find((x) => x.id === s.orderId)!;
  const c = db.customers.find((x) => x.id === o.customerId)!;
  const [qty, setQty] = useState<string>(String(s.orderedQty));
  const [otp, setOtp] = useState('');
  const [reason, setReason] = useState('');
  const [failing, setFailing] = useState(false);
  const [failReason, setFailReason] = useState(FAIL_REASONS[0]);
  const q = parseInt(qty || '0', 10);
  const partial = q > 0 && q < s.orderedQty;
  const done = s.status !== 'pending';
  const back = () => nav({ name: 'home' });

  return (
    <div className="pb-6">
      <Top title={`Stop ${s.seq} of ${t.stops.length}`} back={back} right={done ? <StatusBadge meta={stopStatusMeta[s.status]} /> : undefined} />
      <div className="space-y-3 p-4">
        <Card>
          <div className="flex items-center justify-between"><div className="text-[16px] font-bold">{c.name}</div><span className="text-[15px] font-bold">{litres(s.orderedQty)}</span></div>
          <div className="mt-2 flex gap-2 text-[13px]"><MapPin size={16} className="mt-0.5 shrink-0 text-brand-secondary" /><div>{o.address.line}, {o.address.area}{o.address.landmark && <div className="text-[12px] text-ink-soft">Landmark: {o.address.landmark}</div>}</div></div>
          {o.address.instructions && <div className="mt-2 rounded-lg bg-[#fbf7ec] p-2.5 text-[12px]"><b>Note:</b> {o.address.instructions}</div>}
          {!done && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => ok('Opens Google Maps navigation')} className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-secondary py-3 text-[13px] font-bold text-white"><Navigation size={16} /> Navigate</button>
              <button onClick={() => ok('Calling the customer')} className="flex items-center justify-center gap-1.5 rounded-xl border border-line py-3 text-[13px] font-bold"><Phone size={16} /> Call</button>
            </div>
          )}
        </Card>

        {done ? (
          <Card className={clsx(s.status === 'delivered' ? 'border-status-success/40' : s.status === 'partial' ? 'border-status-warning/40' : 'border-status-error/40')}>
            <div className="text-[14px] font-bold">{s.status === 'failed' ? 'Not delivered' : 'Delivered'}</div>
            <div className="mt-1 text-[12.5px]">{litres(s.deliveredQty ?? 0)} of {litres(s.orderedQty)}{s.reason && ` · ${s.reason}`}</div>
            {s.pod && <div className="mt-1 text-[11.5px] text-ink-soft">Confirmed with customer’s code · {dateTime(s.pod.at)}</div>}
            <Big className="mt-3" onClick={back}>Back to my deliveries</Big>
          </Card>
        ) : t.status !== 'in_transit' ? (
          <Card className="text-center text-[13px] text-ink-soft">Start the trip first.</Card>
        ) : !failing ? (
          <Card className="space-y-3">
            <div>
              <label className="label">Litres delivered</label>
              <input className="input text-2xl font-bold" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
              {q > s.orderedQty && <div className="mt-1 text-[12px] font-semibold text-status-error">More than the {litres(s.orderedQty)} ordered.</div>}
              {partial && (
                <select className="input mt-2" value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Why less than ordered?</option>{PARTIAL_REASONS.map((r) => <option key={r}>{r}</option>)}</select>
              )}
            </div>
            <div>
              <label className="label">Customer’s 4-digit code</label>
              <input className="input text-center text-2xl font-bold tracking-[0.5em]" maxLength={4} inputMode="numeric" placeholder="••••" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
              <div className="mt-1 text-[11px] text-ink-soft">The customer sees it in their app. Demo hint: <span className="font-mono font-semibold">{o.deliveryOtp}</span></div>
            </div>
            <Big disabled={otp.length !== 4 || !(q > 0) || q > s.orderedQty || (partial && !reason)} onClick={() => { if (completeStop(t.id, s.id, q, otp, partial ? reason : undefined).ok) { ok('Delivery recorded'); back(); } }}>
              <Fuel size={18} /> Confirm delivery
            </Big>
            <button onClick={() => setFailing(true)} className="w-full py-1 text-[12.5px] font-semibold text-status-error">Couldn’t deliver?</button>
          </Card>
        ) : (
          <Card className="space-y-2 border-status-error/40">
            <div className="text-[13px] font-bold text-status-error">Couldn’t deliver</div>
            <select className="input" value={failReason} onChange={(e) => setFailReason(e.target.value)}>{FAIL_REASONS.map((r) => <option key={r}>{r}</option>)}</select>
            <div className="text-[11px] text-ink-soft">The fuel stays on your truck. PAC will contact the customer. Your other stops carry on.</div>
            <button onClick={() => { if (failStop(t.id, s.id, failReason).ok) { ok('Reported to PAC'); back(); } }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-status-error py-3 text-[14px] font-bold text-white"><XCircle size={17} /> Report not delivered</button>
            <button onClick={() => setFailing(false)} className="w-full py-1 text-[12.5px] font-semibold text-ink-soft">Back</button>
          </Card>
        )}
      </div>
    </div>
  );
}

// ---------- HISTORY / ALERTS / PROFILE ----------
function DHistory() {
  const trips = useMyTrips().filter((t) => t.status === 'completed');
  return (
    <div>
      <Top title="History" />
      <div className="space-y-2 p-4">
        {trips.length === 0 && <Card className="text-center text-[13px] text-ink-soft">No finished trips yet.</Card>}
        {trips.map((t) => (
          <Card key={t.id}>
            <div className="flex items-center justify-between"><span className="font-bold">{t.id}</span><span className="text-[11px] text-ink-soft">{dateTime(t.completedAt ?? t.createdAt)}</span></div>
            <div className="mt-1 text-[12px]">Delivered <b>{litres(t.stops.reduce((a, s) => a + (s.deliveredQty ?? 0), 0))}</b> to {t.stops.length} customer(s)</div>
            <div className="mt-2 flex flex-wrap gap-1">{t.stops.map((s) => <Badge key={s.id} tone={stopStatusMeta[s.status].tone}>#{s.seq} {stopStatusMeta[s.status].label}</Badge>)}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DAlerts() {
  const id = useStore((s) => s.session.driverId);
  const all = useStore((s) => s.db.notifications);
  const markRead = useStore((s) => s.markRead);
  const list = all.filter((n) => n.audience === 'driver' && n.recipientId === id);
  return (
    <div>
      <Top title="Alerts" right={<button onClick={() => markRead('driver', id)} className="text-[12px] font-semibold text-brand-accent">Mark read</button>} />
      <div className="space-y-2 p-4">
        {list.length === 0 && <Card className="text-center text-[13px] text-ink-soft">No alerts.</Card>}
        {list.map((n) => (
          <Card key={n.id} className={clsx(!n.read && 'border-brand-accent bg-[#fffdf7]')}>
            <div className="flex justify-between gap-2"><span className="text-[13px] font-bold">{n.type}</span><span className="text-[10.5px] text-ink-soft">{ago(n.at)}</span></div>
            <div className="mt-0.5 text-[12.5px]">{n.message}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DProfile() {
  const d = useDriver();
  const v = useStore((s) => s.db.vehicles.find((x) => x.id === d.vehicleId));
  return (
    <div>
      <Top title="Profile" />
      <div className="space-y-3 p-4">
        <Card className="space-y-1.5 text-[13px]">
          {[['Name', d.name], ['Driver ID', d.id], ['Phone', d.phone], ['Account', d.status.replace('_', ' ')], ['Licence', d.licenceNo], ['Licence expiry', d.licenceExpiry], ['My truck', v ? `${v.reg} (${litres(v.capacity)})` : '—']].map(([k, val]) => (
            <div key={k} className="flex justify-between"><span className="text-ink-soft">{k}</span><span className="font-semibold capitalize">{val}</span></div>
          ))}
        </Card>
        <Card className="text-[12px] text-ink-soft"><Lock size={12} className="mr-1 inline" />Your truck and account are managed by PAC. Contact operations for changes.</Card>
      </div>
    </div>
  );
}
