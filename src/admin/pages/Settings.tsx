import { useState } from 'react';
import { Badge, Button, Callout, Card, Field, PageHeader, ok } from '../../components/ui';
import { useDb } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { AREAS } from '../../lib/seed';
import { dateTime, naira } from '../../lib/format';

export default function SettingsPage() {
  const db = useDb();
  const st = db.settings;
  const { updatePrice, updateSettings } = useStore.getState();
  const [price, setPrice] = useState(String(st.unitPrice));
  const [fee, setFee] = useState(String(st.deliveryFee));
  const [reason, setReason] = useState('');
  const [min, setMin] = useState(String(st.minOrder));
  const [max, setMax] = useState(String(st.maxOrder));
  const [low, setLow] = useState(String(st.lowStockThreshold));
  const [stale, setStale] = useState(String(st.gpsStaleAfterSec));

  return (
    <div>
      <PageHeader title="Settings & business configuration" subtitle="Approved business rules are configuration, not code. Every change records the previous value, new value, staff member, time and reason." />
      <div className="mb-4"><Callout tone="gold" title="Pending management approval">Values shown are demo placeholders. The developer must not invent PAC’s policies — these are set by authorised management.</Callout></div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Pricing">
          <div className="grid grid-cols-2 gap-3">
            <Field label="PMS price per litre (₦)"><input className="input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
            <Field label="Delivery fee (₦)"><input className="input" type="number" value={fee} onChange={(e) => setFee(e.target.value)} /></Field>
          </div>
          <Field label="Reason for change (required)"><input className="input mt-0" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Depot price increase" /></Field>
          <Button className="mt-3" onClick={() => {
            let changed = false;
            if (+price !== st.unitPrice) changed = updatePrice('unitPrice', +price, reason).ok || changed;
            if (+fee !== st.deliveryFee) changed = updatePrice('deliveryFee', +fee, reason).ok || changed;
            if (changed) { ok('Price updated — applies to new orders only'); setReason(''); }
          }}>Save pricing</Button>
          <p className="mt-2 text-[12px] text-ink-soft">Confirmed orders keep the price they were placed at. Customers see the new price immediately in the app.</p>
          <div className="mt-4 border-t border-line pt-3">
            <div className="mb-2 text-[12px] font-semibold text-ink-soft">Price history</div>
            {st.priceHistory.map((p, i) => <div key={i} className="flex justify-between border-b border-line/60 py-1.5 text-[12.5px] last:border-0"><span>{p.field === 'unitPrice' ? 'Price/L' : 'Delivery fee'}: {naira(p.from)} → <b>{naira(p.to)}</b> · {p.reason}</span><span className="text-ink-soft">{p.by} · {dateTime(p.at)}</span></div>)}
          </div>
        </Card>

        <Card title="Order & service settings">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Minimum order (L)"><input className="input" type="number" value={min} onChange={(e) => setMin(e.target.value)} /></Field>
            <Field label="Maximum order (L)"><input className="input" type="number" value={max} onChange={(e) => setMax(e.target.value)} /></Field>
          </div>
          <Button size="sm" className="mt-2" onClick={() => { if (updateSettings({ minOrder: +min, maxOrder: +max }, 'Order quantity limits').ok) ok('Limits saved'); }}>Save limits</Button>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-surface-secondary p-3 text-[13px]">
            <span>Accepting orders <span className="text-ink-soft">· {st.operatingHours}</span></span>
            <Button size="sm" variant={st.acceptingOrders ? 'danger' : 'primary'} onClick={() => updateSettings({ acceptingOrders: !st.acceptingOrders }, 'Service availability')}>{st.acceptingOrders ? 'Pause ordering' : 'Resume ordering'}</Button>
          </div>
          <div className="mt-4">
            <div className="label">Approved delivery areas</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(AREAS).map((a) => {
                const on = st.serviceAreas.includes(a);
                return <button key={a} onClick={() => updateSettings({ serviceAreas: on ? st.serviceAreas.filter((x) => x !== a) : [...st.serviceAreas, a] }, `Service area ${on ? 'removed' : 'added'}: ${a}`)} className={`rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ${on ? 'bg-brand-secondary text-white ring-brand-secondary' : 'bg-white text-ink-soft ring-line'}`}>{a}</button>;
              })}
            </div>
          </div>
        </Card>

        <Card title="Payment settings">
          {([['card', 'Card / online gateway'], ['bank_transfer', 'Bank transfer'], ['pay_on_delivery', 'Payment on delivery']] as const).map(([k, l]) => (
            <div key={k} className="flex items-center justify-between border-b border-line/60 py-2 text-[13px] last:border-0">
              <span>{l} {k === 'pay_on_delivery' && <Badge tone="warning" className="ml-1">Disabled until approved</Badge>}</span>
              <Button size="sm" variant={st.paymentMethods[k] ? 'outline' : 'primary'} disabled={k === 'pay_on_delivery'} onClick={() => updateSettings({ paymentMethods: { ...st.paymentMethods, [k]: !st.paymentMethods[k] } }, `Payment method ${l}`)}>{st.paymentMethods[k] ? 'Disable' : 'Enable'}</Button>
            </div>
          ))}
          <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-secondary p-3 text-[13px]">
            <span>Require verified payment before confirmation</span><Badge tone={st.requirePaymentBeforeConfirmation ? 'success' : 'warning'}>{st.requirePaymentBeforeConfirmation ? 'On' : 'Off'}</Badge>
          </div>
        </Card>

        <Card title="Operational settings">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Low-stock alert (L)"><input className="input" type="number" value={low} onChange={(e) => setLow(e.target.value)} /></Field>
            <Field label="GPS stale after (s)"><input className="input" type="number" value={stale} onChange={(e) => setStale(e.target.value)} /></Field>
          </div>
          <Button size="sm" className="mt-3" onClick={() => { if (updateSettings({ lowStockThreshold: +low, gpsStaleAfterSec: +stale }, 'Operational thresholds').ok) ok('Saved'); }}>Save operational settings</Button>
          <div className="mt-4 space-y-1 text-[12.5px] text-ink-soft">
            <div>Proof-of-delivery method: <b className="text-ink">Customer OTP</b> (pending approval)</div>
            <div>Driver ↔ customer contact: <b className="text-ink">Registered number, assigned driver only</b> (pending approval)</div>
            <div>Partial delivery resolution: <b className="text-ink">Manager decides per case</b> (pending policy)</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
