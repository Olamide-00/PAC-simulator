import { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Fuel, PackagePlus, Truck, UserRound } from 'lucide-react';
import { Badge, Button, Callout, Card, Field, PageHeader, ProgressBar, Stat, ok } from '../../components/ui';
import { inventoryFigures, useDb } from '../../lib/selectors';
import { truckCommitted, useStore } from '../../lib/store';
import { dateTime, litres } from '../../lib/format';
import type { MovementType } from '../../lib/types';

const MOVE: Record<MovementType, { label: string; tone: 'success' | 'info' | 'brand' }> = {
  receipt: { label: 'Received at depot', tone: 'success' }, load: { label: 'Loaded into truck', tone: 'info' }, unload: { label: 'Unloaded to depot', tone: 'brand' },
};
const CHAIN = [['Supplier', PackagePlus], ['Depot tank', Fuel], ['Truck', Truck], ['Customer', UserRound]] as const;

export default function Inventory() {
  const db = useDb();
  const inv = inventoryFigures(db);
  const { recordReceipt, loadTruck, unloadTruck } = useStore.getState();
  const [qty, setQty] = useState('');
  const [supplier, setSupplier] = useState('');
  const [ref, setRef] = useState('');
  const [amount, setAmount] = useState<Record<string, string>>({});
  const trucks = db.vehicles.filter((v) => !v.removed);
  const low = inv.available < db.settings.lowStockThreshold;

  return (
    <div>
      <PageHeader title="Fuel & Inventory" subtitle="Fuel arrives at the depot from the supplier, then you load it into a truck. Each delivery takes litres out of the truck. Any fuel left over can be unloaded back to the depot." />
      {low && <div className="mb-4"><Callout tone="error" title="Low stock">Petrol available to sell is below {litres(db.settings.lowStockThreshold)}. Record a new delivery from the supplier.</Callout></div>}

      <div className="mb-5 flex flex-wrap items-center gap-2 text-[12.5px]">
        {CHAIN.map(([l, I], i) => (
          <span key={l} className="flex items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-semibold shadow-card ring-1 ring-line"><I size={14} className="text-brand-secondary" />{l}</span>{i < CHAIN.length - 1 && <span className="text-ink-soft">→</span>}</span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="In the depot" value={litres(inv.depot)} />
        <Stat label="On trucks" value={litres(inv.onTrucks)} />
        <Stat label="Promised to orders" value={litres(inv.reserved)} hint="Confirmed, not yet delivered" />
        <Stat label="Available to sell" value={litres(inv.available)} tone={low ? 'alert' : 'gold'} hint="Depot + trucks − promised" />
      </div>

      <h2 className="mb-3 mt-6 text-[15px] font-bold">Trucks</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {trucks.map((v) => {
          const driver = db.drivers.find((d) => d.id === v.driverId);
          const committed = truckCommitted(db, v.id);
          const n = parseInt(amount[v.id] || '0', 10);
          const onRoad = v.status === 'on_trip';
          return (
            <Card key={v.id}>
              <div className="flex items-center justify-between gap-3">
                <div><div className="text-[15px] font-bold">{v.reg}</div><div className="text-[12px] text-ink-soft">{driver ? `Driver: ${driver.name}` : 'No driver'} · {litres(v.capacity)} tank</div></div>
                {onRoad ? <Badge tone="info">On the road</Badge> : <Badge tone="success">At depot</Badge>}
              </div>
              <div className="mt-3 flex items-end justify-between"><span className="text-2xl font-bold">{litres(v.fuel)}</span><span className="text-[12px] text-ink-soft">space for {litres(v.capacity - v.fuel)}</span></div>
              <div className="mt-1.5"><ProgressBar value={v.fuel} max={v.capacity} tone="gold" /></div>
              {committed > 0 && <div className="mt-1.5 text-[12px] text-ink-soft">{litres(committed)} of it is for deliveries already assigned.</div>}
              {onRoad ? <p className="mt-3 text-[12px] text-ink-soft">You can load or unload when the truck is back at the depot.</p> : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input className="input w-32" type="number" placeholder="Litres" value={amount[v.id] ?? ''} onChange={(e) => setAmount({ ...amount, [v.id]: e.target.value })} />
                  <Button onClick={() => { if (loadTruck(v.id, n).ok) { ok(`${litres(n)} loaded into ${v.reg}`); setAmount({ ...amount, [v.id]: '' }); } }}><ArrowUpFromLine size={15} /> Load into truck</Button>
                  <Button variant="outline" onClick={() => { if (unloadTruck(v.id, n).ok) { ok(`${litres(n)} returned to the depot`); setAmount({ ...amount, [v.id]: '' }); } }}><ArrowDownToLine size={15} /> Unload to depot</Button>
                  <button className="text-[12px] font-semibold text-brand-secondary hover:underline" onClick={() => setAmount({ ...amount, [v.id]: String(v.capacity - v.fuel) })}>Fill up</button>
                </div>
              )}
            </Card>
          );
        })}
        {trucks.length === 0 && <Callout tone="info">No trucks yet — add one on the Vehicles page.</Callout>}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <Card title="Record fuel received from supplier">
          <div className="space-y-2.5">
            <Field label="Litres received"><input className="input" type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
            <Field label="Supplier"><input className="input" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Lekki Coastal Depot" /></Field>
            <Field label="Waybill / receipt number"><input className="input" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="GRN-2202" /></Field>
            <Button onClick={() => { if (recordReceipt(parseInt(qty || '0', 10), supplier, ref).ok) { ok('Fuel added to the depot'); setQty(''); setRef(''); } }}><PackagePlus size={15} /> Add to depot</Button>
          </div>
        </Card>

        <Card title="Fuel movements" pad={false}>
          <div className="max-h-[360px] overflow-y-auto scroll-thin">
            <table className="w-full">
              <thead className="sticky top-0 bg-surface-secondary"><tr>{['When', 'What', 'Depot change', 'Details', 'By'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>
                {db.movements.map((m) => (
                  <tr key={m.id} className="border-t border-line">
                    <td className="td text-ink-soft">{dateTime(m.at)}</td>
                    <td className="td"><Badge tone={MOVE[m.type].tone}>{MOVE[m.type].label}</Badge></td>
                    <td className={`td font-semibold ${m.qty < 0 ? 'text-status-error' : 'text-status-success'}`}>{m.qty > 0 ? '+' : ''}{litres(m.qty)}</td>
                    <td className="td max-w-[260px] truncate">{m.ref}</td><td className="td text-ink-soft">{m.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
