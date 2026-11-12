import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { Radio, WifiOff, MapPinOff, RotateCcw } from 'lucide-react';
import { Badge, Button, Card, Empty, KV, PageHeader, ProgressBar, StatusBadge } from '../../components/ui';
import { LagosMap } from '../../components/LagosMap';
import { gpsView, useDb, useNow } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { ago, litres, stopStatusMeta, tripStatusMeta } from '../../lib/format';

export default function Tracking() {
  const db = useDb();
  const now = useNow(1000);
  const setGpsState = useStore((s) => s.setGpsState);
  const trips = db.trips.filter((t) => ['in_transit', 'assigned', 'acknowledged'].includes(t.status));
  const [params] = useSearchParams();
  const [selId, setSelId] = useState<string | undefined>(params.get('trip') ?? undefined);
  const sel = trips.find((t) => t.id === selId) ?? trips[0];

  return (
    <div>
      <PageHeader title="Live Tracking" subtitle="Vehicle positions reported by the Driver App. Live, stale, offline and permission states are always distinguished — an old position is never shown as live." />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card pad={false}>
          <div className="p-3">
            <LagosMap
              className="h-[520px]"
              vehicles={trips.filter((t) => t.status === 'in_transit').map((t) => {
                const g = gpsView(t, db.settings.gpsStaleAfterSec, now);
                return { id: t.id, label: `${db.vehicles.find((v) => v.id === t.vehicleId)?.reg}`, pos: t.gps.pos, live: g.live, selected: t.id === sel?.id, caption: g.live ? undefined : `${g.label} · ${ago(t.gps.updatedAt, now)}` };
              })}
              pins={sel ? sel.stops.map((s) => ({ id: s.id, seq: s.seq, pos: db.orders.find((o) => o.id === s.orderId)!.address.pos, label: db.orders.find((o) => o.id === s.orderId)!.address.area, tone: stopStatusMeta[s.status].tone })) : []}
              route={sel ? [sel.gps.pos, ...sel.stops.filter((s) => s.status === 'pending').map((s) => db.orders.find((o) => o.id === s.orderId)!.address.pos)] : undefined}
              onVehicleClick={setSelId}
            />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3 text-[12px]">
            <Badge tone="success">Live — recent valid update</Badge><Badge tone="warning">Stale — last known</Badge><Badge tone="error">Offline / permission off</Badge><Badge tone="neutral">No GPS record</Badge>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Vehicles" pad={false}>
            {trips.length === 0 && <div className="p-4"><Empty>No active trips. Assign a driver to an order, then the driver starts it from the Driver App.</Empty></div>}
            {trips.map((t) => {
              const g = gpsView(t, db.settings.gpsStaleAfterSec, now);
              const done = t.stops.filter((s) => s.status !== 'pending').length;
              return (
                <button key={t.id} onClick={() => setSelId(t.id)} className={clsx('block w-full border-b border-line px-4 py-3 text-left last:border-0', sel?.id === t.id && 'bg-brand-secondary/5')}>
                  <div className="flex items-center justify-between"><span className="text-[13px] font-semibold">{db.vehicles.find((v) => v.id === t.vehicleId)?.reg} · {t.id}</span><StatusBadge meta={tripStatusMeta[t.status]} /></div>
                  <div className="mt-1 text-[12px] text-ink-soft">{db.drivers.find((d) => d.id === t.driverId)?.name} · {t.stops.length - done} stop(s) remaining</div>
                  <div className="mt-2"><ProgressBar value={done} max={t.stops.length} /></div>
                  {t.status === 'in_transit' && <div className="mt-2"><Badge tone={g.tone}>{g.label} · {ago(t.gps.updatedAt, now)}</Badge></div>}
                </button>
              );
            })}
          </Card>

          {sel && (
            <Card title={`Trip ${sel.id}`}>
              <KV k="Driver" v={db.drivers.find((d) => d.id === sel.driverId)?.name} />
              <KV k="Truck" v={`${db.vehicles.find((v) => v.id === sel.vehicleId)?.reg} · ${litres(db.vehicles.find((v) => v.id === sel.vehicleId)?.fuel ?? 0)} on board`} />
              <KV k="For these deliveries" v={litres(sel.allocatedQty)} />
              <KV k="Last GPS update" v={sel.gps.state === 'none' ? '—' : `${ago(sel.gps.updatedAt, now)}`} />
              <div className="mt-3 space-y-1.5">
                {sel.stops.map((s) => {
                  const o = db.orders.find((x) => x.id === s.orderId)!;
                  return <div key={s.id} className="flex items-center justify-between text-[12.5px]"><span>#{s.seq} {o.address.area} · {litres(s.orderedQty)}</span><StatusBadge meta={stopStatusMeta[s.status]} /></div>;
                })}
              </div>
              {sel.status === 'in_transit' && (
                <div className="mt-4 rounded-xl bg-surface-secondary p-3">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Demo: simulate GPS conditions</div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setGpsState(sel.id, 'offline')}><WifiOff size={13} /> Device offline</Button>
                    <Button size="sm" variant="outline" onClick={() => setGpsState(sel.id, 'permission_denied')}><MapPinOff size={13} /> Permission off</Button>
                    <Button size="sm" variant="outline" onClick={() => setGpsState(sel.id, 'live')}><Radio size={13} /> Restore</Button>
                  </div>
                  <p className="mt-2 text-[11px] text-ink-soft">With no update for {db.settings.gpsStaleAfterSec}s the position automatically becomes “Stale”. ETAs are hidden when location isn’t live.</p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-ink-soft"><RotateCcw size={12} /> Customers see only their own stop and the vehicle — never other customers’ addresses on the same trip.</p>
    </div>
  );
}
