import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, Field, KV, Modal, PageHeader, StatusBadge, ok } from '../../components/ui';
import { useDb } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { date, dateTime, litres, naira, orderStatusMeta, paymentStatusMeta } from '../../lib/format';

export default function Customers() {
  const db = useDb();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const open = params.get('open');
  const rows = db.customers.filter((c) => [c.name, c.id, c.phone, c.email].some((v) => v.toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <PageHeader title="Customers" subtitle="Customer records and account operations. Passwords and payment credentials are never displayed." />
      <Card pad={false}>
        <div className="border-b border-line p-3"><input className="input max-w-xs" placeholder="Search name, ID, phone, email…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full">
            <thead className="bg-surface-secondary/60"><tr>{['Customer ID', 'Full name', 'Phone', 'Email', 'Type', 'Registered', 'Status', 'Total orders', 'Last order'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((c) => {
                const os = db.orders.filter((o) => o.customerId === c.id);
                return (
                  <tr key={c.id} onClick={() => setParams({ open: c.id })} className="cursor-pointer border-t border-line hover:bg-surface-secondary/50">
                    <td className="td font-semibold text-brand-secondary">{c.id}</td><td className="td">{c.name}</td><td className="td text-ink-soft">{c.phone}</td><td className="td text-ink-soft">{c.email}</td>
                    <td className="td capitalize">{c.category}</td><td className="td text-ink-soft">{date(c.registeredAt)}</td>
                    <td className="td"><Badge tone={c.status === 'active' ? 'success' : 'error'}>{c.status}</Badge></td><td className="td">{os.length}</td><td className="td text-ink-soft">{os[0] ? dateTime(Math.max(...os.map((o) => o.createdAt))) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {open && <Profile id={open} onClose={() => setParams({})} />}
    </div>
  );
}

function Profile({ id, onClose }: { id: string; onClose: () => void }) {
  const db = useDb();
  const setCustomerStatus = useStore((s) => s.setCustomerStatus);
  const [reason, setReason] = useState('');
  const c = db.customers.find((x) => x.id === id);
  if (!c) return null;
  const orders = db.orders.filter((o) => o.customerId === c.id);
  const pays = db.payments.filter((p) => p.customerId === c.id);
  const tickets = db.complaints.filter((x) => x.customerId === c.id);
  return (
    <Modal open onClose={onClose} title={`${c.name} · ${c.id}`} wide>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Account"><KV k="Phone" v={c.phone} /><KV k="Email" v={c.email} /><KV k="Type" v={c.category} /><KV k="Verification" v={c.verified ? 'Phone verified (OTP)' : 'Unverified'} /><KV k="Status" v={c.status} /></Card>
        <Card title="Delivery addresses">{c.addresses.map((a, i) => <div key={a.id} className="mb-2 text-[13px]"><b>{a.label}</b>{i === 0 && <Badge tone="brand" className="ml-2">Default</Badge>}<div className="text-ink-soft">{a.line}, {a.area} · {db.settings.serviceAreas.includes(a.area) ? 'In service area' : 'Outside service area'}</div>{a.instructions && <div className="text-[12px] italic text-ink-soft">{a.instructions}</div>}</div>)}</Card>
      </div>
      <Card title={`Order history (${orders.length})`} className="mt-4" pad={false}>
        {orders.map((o) => <div key={o.id} className="flex items-center justify-between border-b border-line px-4 py-2 text-[13px] last:border-0"><span><b>{o.id}</b> · {litres(o.qty)} · {naira(o.total)}{o.deliveredQty !== undefined && ` · delivered ${litres(o.deliveredQty)}`}</span><StatusBadge meta={orderStatusMeta[o.status]} /></div>)}
      </Card>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card title="Payments">{pays.map((p) => <div key={p.id} className="flex items-center justify-between py-1 text-[13px]"><span>{p.id} · {naira(p.amountDue)}</span><StatusBadge meta={paymentStatusMeta[p.status]} /></div>)}</Card>
        <Card title="Support history">{tickets.length ? tickets.map((t) => <div key={t.id} className="py-1 text-[13px]"><b>{t.id}</b> · {t.category} · <span className="capitalize">{t.status.replace('_', ' ')}</span></div>) : <div className="text-[13px] text-ink-soft">No complaints.</div>}</Card>
      </div>
      <Card title="Account action" className="mt-4">
        <Field label="Reason (required — audited)"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Suspected fraudulent payment evidence" /></Field>
        <div className="mt-3">
          {c.status === 'active'
            ? <Button variant="danger" onClick={() => { if (setCustomerStatus(c.id, 'suspended', reason).ok) ok('Account suspended'); }}>Suspend account</Button>
            : <Button onClick={() => { if (setCustomerStatus(c.id, 'active', reason).ok) ok('Account reactivated'); }}>Reactivate account</Button>}
        </div>
      </Card>
    </Modal>
  );
}
