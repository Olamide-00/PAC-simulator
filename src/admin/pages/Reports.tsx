import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button, Card, PageHeader, Stat, Tabs, ok } from '../../components/ui';
import { inventoryFigures, kpis, useCurrentStaff, useDb, verifiedRevenue } from '../../lib/selectors';
import { can } from '../../lib/permissions';
import { useStore } from '../../lib/store';
import { litres, naira } from '../../lib/format';

type Tab = 'orders' | 'financial' | 'inventory' | 'dispatch' | 'drivers';
const axis = { tick: { fontSize: 11, fill: '#77827B' }, axisLine: false, tickLine: false } as const;

export default function Reports() {
  const db = useDb();
  const staff = useCurrentStaff();
  const [tab, setTab] = useState<Tab>('orders');
  const [range, setRange] = useState(14);
  const h = db.history.slice(-range);
  const k = kpis(db);
  const inv = inventoryFigures(db);
  const stops = db.trips.flatMap((t) => t.stops);
  const closed = db.trips.filter((t) => t.completedAt && t.startedAt);
  const avgDur = closed.length ? Math.round(closed.reduce((a, t) => a + (t.completedAt! - t.startedAt!), 0) / closed.length / 60000) : 0;

  const exportCsv = () => {
    if (!can(staff.role, 'reports.export')) { useStore.getState().showToast('err', '403 — your role cannot export reports.'); return; }
    const lines = [`PAC Petrol — ${tab} report`, `Reporting period: last ${range} days`, `Generated: ${new Date().toLocaleString('en-NG')} by ${staff.name}`, '', 'Day,Orders,Litres,Verified revenue (NGN),Failed,Partial', ...h.map((r) => [r.day, r.orders, r.litres, r.revenue, r.failed, r.partial].join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pac-${tab}-report.csv`; a.click();
    ok('Excel-compatible report exported');
  };

  return (
    <div>
      <PageHeader title="Reports & analytics" subtitle="Charts combine live demo data with 30 days of sample history. Revenue figures use verified financial records only."
        actions={<><select className="input w-36" value={range} onChange={(e) => setRange(+e.target.value)}><option value={7}>Last 7 days</option><option value={14}>Last 14 days</option><option value={30}>Last 30 days</option></select>
          <Button variant="outline" onClick={() => window.print()}><Printer size={15} /> PDF</Button><Button variant="secondary" onClick={exportCsv}><Download size={15} /> Excel</Button></>} />
      <div className="mb-4"><Tabs value={tab} onChange={setTab} items={[{ value: 'orders', label: 'Orders' }, { value: 'financial', label: 'Financial' }, { value: 'inventory', label: 'Inventory' }, { value: 'dispatch', label: 'Trips & deliveries' }, { value: 'drivers', label: 'Driver performance' }]} /></div>

      {tab === 'orders' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Orders (period)" value={h.reduce((a, r) => a + r.orders, 0)} />
            <Stat label="Litres ordered (period)" value={litres(h.reduce((a, r) => a + r.litres, 0))} />
            <Stat label="Live demo orders" value={k.total} />
            <Stat label="Cancelled (live)" value={db.orders.filter((o) => o.status === 'cancelled').length} />
            <Stat label="Avg order value (live)" value={naira(db.orders.reduce((a, o) => a + o.total, 0) / Math.max(1, db.orders.length))} />
          </div>
          <Card title="Orders and litres per day">
            <div className="h-72"><ResponsiveContainer><BarChart data={h}><CartesianGrid stroke="#eee9dc" vertical={false} /><XAxis dataKey="day" {...axis} /><YAxis yAxisId="l" {...axis} /><YAxis yAxisId="r" orientation="right" {...axis} /><Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="l" dataKey="orders" name="Orders" fill="#174B3D" radius={[4, 4, 0, 0]} /><Bar yAxisId="r" dataKey="litres" name="Litres" fill="#D7C18A" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
          </Card>
        </div>
      )}

      {tab === 'financial' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Verified revenue (live)" value={naira(verifiedRevenue(db))} tone="gold" />
            <Stat label="Awaiting verification" value={k.paymentsAwaiting} />
            <Stat label="Outstanding balances" value={naira(k.outstanding)} />
            <Stat label="Refunds" value={naira(db.payments.reduce((a, p) => a + (p.refund?.amount ?? 0), 0))} />
          </div>
          <Card title="Verified revenue per day (₦)">
            <div className="h-72"><ResponsiveContainer><LineChart data={h}><CartesianGrid stroke="#eee9dc" vertical={false} /><XAxis dataKey="day" {...axis} /><YAxis tickFormatter={(v) => `₦${(v / 1e6).toFixed(1)}m`} {...axis} width={56} /><Tooltip formatter={(v: number) => naira(v)} contentStyle={{ borderRadius: 10, fontSize: 12 }} /><Line dataKey="revenue" name="Verified revenue" stroke="#174B3D" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div>
          </Card>
          <p className="text-[12px] text-ink-soft">Revenue is not profit. Profit reporting requires verified purchase costs and operating expenses, which can be recorded against stock receipts.</p>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Stock received" value={litres(db.movements.filter((m) => m.type === 'receipt').reduce((a, m) => a + m.qty, 0))} />
          <Stat label="Stock reserved" value={litres(inv.reserved)} /><Stat label="Stock available" value={litres(inv.available)} />
          <Stat label="Stock loaded" value={litres(-db.movements.filter((m) => m.type === 'load').reduce((a, m) => a + m.qty, 0))} />
          <Stat label="On trucks now" value={litres(inv.onTrucks)} /><Stat label="Delivered" value={litres(inv.delivered)} />
          <Stat label="Unloaded back to depot" value={litres(db.movements.filter((m) => m.type === 'unload').reduce((a, m) => a + m.qty, 0))} />
        </div>
      )}

      {tab === 'dispatch' && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Trips" value={db.trips.length} /><Stat label="Delivery stops" value={stops.length} />
          <Stat label="Completed stops" value={k.completedStops} /><Stat label="Partial stops" value={k.partialStops} />
          <Stat label="Failed stops" value={k.failedStops} /><Stat label="Avg trip duration" value={`${avgDur} min`} />
          <Stat label="Quantity delivered" value={litres(inv.delivered)} /><Stat label="Fuel on trucks now" value={litres(inv.onTrucks)} />
        </div>
      )}

      {tab === 'drivers' && (
        <Card pad={false}>
          <table className="w-full">
            <thead className="bg-surface-secondary/60"><tr>{['Driver', 'Trips completed', 'Stops completed', 'Partial', 'Failed', 'Litres delivered', 'Incidents'].map((x) => <th key={x} className="th">{x}</th>)}</tr></thead>
            <tbody>
              {db.drivers.map((d) => {
                const ts = db.trips.filter((t) => t.driverId === d.id); const st = ts.flatMap((t) => t.stops);
                return (
                  <tr key={d.id} className="border-t border-line">
                    <td className="td font-semibold">{d.name}</td><td className="td">{ts.filter((t) => t.status === 'completed').length}</td><td className="td">{st.filter((s) => s.status === 'delivered').length}</td>
                    <td className="td">{st.filter((s) => s.status === 'partial').length}</td><td className="td">{st.filter((s) => s.status === 'failed').length}</td>
                    <td className="td">{litres(st.reduce((a, s) => a + (s.deliveredQty ?? 0), 0))}</td><td className="td">{db.audit.filter((a) => a.actor === d.name && a.action === 'Incident reported').length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-4 py-3 text-[12px] text-ink-soft">Delays and exceptions are shown with their recorded reasons — drivers are not automatically penalised for traffic, customer unavailability or system outages.</p>
        </Card>
      )}
    </div>
  );
}
