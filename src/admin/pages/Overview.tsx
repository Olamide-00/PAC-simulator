import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Activity } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Badge, Card, PageHeader, Stat } from '../../components/ui';
import { LagosMap } from '../../components/LagosMap';
import { ACTIVE_TRIP, gpsView, inventoryFigures, kpis, useDb, useNow } from '../../lib/selectors';
import { ago, litres, naira, time, tripStatusMeta } from '../../lib/format';

export default function Overview() {
  const db = useDb();
  const now = useNow(2000);
  const nav = useNavigate();
  const k = kpis(db);
  const inv = inventoryFigures(db);
  const active = db.trips.filter(ACTIVE_TRIP);
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const today = db.orders.filter((o) => o.createdAt >= startOfDay.getTime()).length;
  const lowStock = inv.available < db.settings.lowStockThreshold;
  const gpsProblems = active.filter((t) => t.status === 'in_transit' && !gpsView(t, db.settings.gpsStaleAfterSec, now).live);

  const alerts = [
    { n: k.awaitingConfirmation + k.paymentsAwaiting, t: 'Orders to confirm', to: '/admin/orders', sev: 'warning' },
    { n: k.confirmed, t: 'Confirmed orders that need a driver', to: '/admin/orders', sev: 'warning' },
    { n: db.orders.filter((o) => o.status === 'delivery_failed').length, t: 'Failed deliveries needing resolution', to: '/admin/orders', sev: 'critical' },
    { n: db.orders.filter((o) => o.status === 'partially_delivered').length, t: 'Partial deliveries with outstanding litres', to: '/admin/orders', sev: 'critical' },
    { n: gpsProblems.length, t: 'GPS connection problems', to: '/admin/tracking', sev: 'critical' },
    { n: lowStock ? 1 : 0, t: `Low stock — below ${litres(db.settings.lowStockThreshold)}`, to: '/admin/inventory', sev: 'critical' },
    { n: db.vehicles.filter((v) => !v.removed && ['maintenance', 'unavailable', 'suspended'].includes(v.status)).length, t: 'Trucks unavailable / suspended', to: '/admin/vehicles', sev: 'warning' },
    { n: k.openComplaints, t: 'Unresolved complaints', to: '/admin/complaints', sev: 'warning' },
  ].filter((a) => a.n > 0).sort((a, b) => (a.sev === 'critical' ? -1 : 1) - (b.sev === 'critical' ? -1 : 1));

  return (
    <div className="space-y-5">
      <PageHeader title="Operations overview" subtitle={`Live snapshot · ${new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Total orders" value={k.total} hint="All time · demo period" onClick={() => nav('/admin/orders')} />
        <Stat label="Pending orders" value={k.pending} hint="Awaiting payment or review" onClick={() => nav('/admin/orders')} />
        <Stat label="Confirmed — need a driver" value={k.confirmed} hint="Assign from Orders" onClick={() => nav('/admin/orders')} />
        <Stat label="Active deliveries" value={k.activeTrips} hint={`${k.inTransit} in transit`} onClick={() => nav('/admin/tracking')} />
        <Stat label="Completed delivery stops" value={k.completedStops} hint="Full quantity + POD" />
        <Stat label="Failed delivery stops" value={k.failedStops} tone={k.failedStops ? 'alert' : undefined} onClick={() => nav('/admin/orders')} />
        <Stat label="Partial delivery stops" value={k.partialStops} hint="Delivered < ordered" onClick={() => nav('/admin/orders')} />
        <Stat label="Verified revenue" value={naira(k.revenue)} hint="Finance/gateway verified only" tone="gold" onClick={() => nav('/admin/payments')} />
        <Stat label="Outstanding payments" value={naira(k.outstanding)} hint="Due or awaiting verification" onClick={() => nav('/admin/payments')} />
        <Stat label="Available to sell" value={litres(inv.available)} hint={`${litres(inv.onTrucks)} on trucks · ${litres(inv.depot)} in depot`} tone={lowStock ? 'alert' : undefined} onClick={() => nav('/admin/inventory')} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card title="Live operations map" action={<button onClick={() => nav('/admin/tracking')} className="text-xs font-semibold text-brand-secondary hover:underline">Open Live Tracking →</button>} pad={false}>
          <div className="p-3">
            <LagosMap
              className="h-[440px]"
              vehicles={active.filter((t) => t.status === 'in_transit').map((t) => {
                const g = gpsView(t, db.settings.gpsStaleAfterSec, now);
                return { id: t.id, label: `${db.vehicles.find((v) => v.id === t.vehicleId)?.reg} · ${t.id}`, pos: t.gps.pos, live: g.live, caption: g.live ? undefined : `${g.label} · ${ago(t.gps.updatedAt, now)}` };
              })}
              pins={active.flatMap((t) => t.stops.map((s) => ({ id: s.id, seq: s.seq, pos: db.orders.find((o) => o.id === s.orderId)!.address.pos, tone: s.status === 'delivered' ? 'success' as const : s.status === 'partial' ? 'warning' as const : s.status === 'failed' ? 'error' as const : 'brand' as const })))}
              onVehicleClick={() => nav('/admin/tracking')}
            />
          </div>
          <div className="divide-y divide-line border-t border-line">
            {active.length === 0 && <div className="px-4 py-3 text-sm text-ink-soft">No active trips. Assign a driver to a confirmed order from Orders.</div>}
            {active.map((t) => {
              const g = gpsView(t, db.settings.gpsStaleAfterSec, now);
              const d = db.drivers.find((x) => x.id === t.driverId)!;
              const remaining = t.stops.filter((s) => s.status === 'pending').length;
              return (
                <div key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-[13px]">
                  <span className="font-semibold">{t.id}</span><span className="text-ink-soft">{d.name}</span>
                  <Badge tone={tripStatusMeta[t.status].tone}>{tripStatusMeta[t.status].label}</Badge>
                  <span className="text-ink-soft">{remaining} stop(s) remaining</span>
                  {t.status === 'in_transit' && <Badge tone={g.tone}>GPS: {g.label} · {ago(t.gps.updatedAt, now)}</Badge>}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-5">
          <Card title={<span className="flex items-center gap-2"><AlertTriangle size={15} className="text-status-warning" /> Attention queue</span>}>
            {alerts.length === 0 ? <div className="text-sm text-ink-soft">Nothing needs attention right now.</div> : (
              <div className="space-y-1.5">
                {alerts.map((a) => (
                  <button key={a.t} onClick={() => nav(a.to)} className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-[13px] transition hover:bg-surface-secondary ${a.sev === 'critical' ? 'border-status-error/30 bg-status-error/5' : 'border-line'}`}>
                    <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white ${a.sev === 'critical' ? 'bg-status-error' : a.sev === 'warning' ? 'bg-status-warning' : 'bg-status-info'}`}>{a.n}</span>
                    <span className="flex-1 font-medium">{a.t}</span><ArrowRight size={14} className="text-ink-soft" />
                  </button>
                ))}
              </div>
            )}
          </Card>
          <Card title="Today’s operational summary">
            {[
              ['Orders received today', today], ['Orders to confirm', k.awaitingConfirmation + k.paymentsAwaiting], ['Confirmed — need a driver', k.confirmed],
              ['Waiting for driver to accept / start', db.trips.filter((t) => ['assigned', 'acknowledged'].includes(t.status)).length], ['Trucks on the road', k.inTransit],
              ['Fuel on trucks', litres(inv.onTrucks)], ['Fuel in depot', litres(inv.depot)],
            ].map(([l, v]) => (
              <div key={l as string} className="flex justify-between border-b border-line/60 py-1.5 text-[13px] last:border-0"><span className="text-ink-soft">{l}</span><span className="font-semibold">{v}</span></div>
            ))}
          </Card>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card title="Verified revenue — last 14 days (incl. sample history)">
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={db.history.slice(-14)} margin={{ left: 0, right: 8, top: 8 }}>
                <defs><linearGradient id="rev" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#174B3D" stopOpacity={0.3} /><stop offset="1" stopColor="#174B3D" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#eee9dc" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#77827B' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `₦${(v / 1e6).toFixed(1)}m`} tick={{ fontSize: 11, fill: '#77827B' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip formatter={(v: number) => naira(v)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#174B3D" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title={<span className="flex items-center gap-2"><Activity size={15} className="text-brand-secondary" /> Recent activity</span>} pad={false}>
          <div className="max-h-64 divide-y divide-line overflow-y-auto scroll-thin">
            {db.events.slice(0, 25).map((e) => (
              <div key={e.id} className="flex gap-3 px-4 py-2 text-[12.5px]">
                <span className="w-12 shrink-0 text-ink-soft">{time(e.at)}</span>
                <div className="min-w-0"><div className="font-medium">{e.event}</div><div className="truncate text-ink-soft">{e.source} · {e.detail}</div></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
