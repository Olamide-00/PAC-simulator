import { useState } from 'react';
import { FileImage, ShieldCheck } from 'lucide-react';
import { Badge, Button, Callout, Card, PageHeader, Stat, StatusBadge, Tabs, ok } from '../../components/ui';
import { useDb, verifiedRevenue, outstandingPayments } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { dateTime, naira, paymentStatusMeta } from '../../lib/format';

export default function Payments() {
  const db = useDb();
  const { verifyPayment, rejectPayment, processRefund } = useStore.getState();
  const [tab, setTab] = useState<'queue' | 'all' | 'refunds'>('queue');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('Amount not received in PAC account');
  const P = db.payments;
  const queue = P.filter((p) => p.status === 'verification_pending' || p.status === 'evidence_submitted');
  const refunds = P.filter((p) => p.refund);
  const cnt = (s: string[]) => P.filter((p) => s.includes(p.status)).length;
  const byMethod = ['card', 'bank_transfer'].map((m) => ({ m, v: P.filter((p) => p.method === m && ['verified', 'refund_pending', 'refunded'].includes(p.status)).reduce((a, p) => a + p.amountDue, 0) }));

  return (
    <div>
      <PageHeader title="Payments & finance" subtitle="Money submitted by a customer is not the same as money received by PAC Petrol. Only Finance-verified or gateway-webhook-verified payments count as revenue." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Stat label="Verified revenue" value={naira(verifiedRevenue(db))} tone="gold" hint="Net of completed refunds" />
        <Stat label="Awaiting verification" value={queue.length} tone={queue.length ? 'alert' : undefined} />
        <Stat label="Pending (unpaid)" value={cnt(['pending'])} />
        <Stat label="Failed / rejected" value={cnt(['failed', 'rejected'])} />
        <Stat label="Refunds pending" value={refunds.filter((p) => p.refund!.status === 'pending').length} />
        <Stat label="Outstanding balances" value={naira(outstandingPayments(db))} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-ink-soft">{byMethod.map((x) => <span key={x.m} className="rounded-md bg-white px-2 py-1 ring-1 ring-line">Verified via {x.m === 'card' ? 'card gateway' : 'bank transfer'}: <b className="text-ink">{naira(x.v)}</b></span>)}</div>

      <div className="mt-5 mb-3"><Tabs value={tab} onChange={setTab} items={[{ value: 'queue', label: `Verification queue (${queue.length})` }, { value: 'all', label: 'All payment records' }, { value: 'refunds', label: `Refunds (${refunds.length})` }]} /></div>

      {tab === 'queue' && (
        <div className="space-y-3">
          <Callout tone="gold" title="Critical financial rule">An uploaded screenshot or receipt does not prove PAC received the money. Check the actual bank statement before verifying. Drivers can never verify payments.</Callout>
          {queue.length === 0 && <Card><div className="text-sm text-ink-soft">Queue is clear.</div></Card>}
          {queue.map((p) => {
            const o = db.orders.find((x) => x.id === p.orderId)!;
            const c = db.customers.find((x) => x.id === p.customerId)!;
            const mismatch = p.amountSubmitted !== undefined && p.amountSubmitted !== p.amountDue;
            return (
              <Card key={p.id}>
                <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                  <div className="text-[13px]">
                    <div className="text-[15px] font-bold">{naira(p.amountDue)} <span className="text-[12px] font-normal text-ink-soft">due</span></div>
                    <div className="mt-1">{c.name} · {o.id}</div>
                    <div className="text-ink-soft">Ref <b className="text-ink">{p.reference}</b> · {dateTime(p.createdAt)}</div>
                    {mismatch && <div className="mt-1 font-semibold text-status-error">Submitted {naira(p.amountSubmitted!)} ≠ due {naira(p.amountDue)}</div>}
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-surface-secondary p-3 text-[12.5px]"><FileImage size={28} className="shrink-0 text-ink-soft" /><div><div className="font-semibold">Customer evidence</div><div className="text-ink-soft">{p.evidence ?? 'No file'}</div></div></div>
                  <div className="flex flex-col gap-2">
                    <Button onClick={() => { if (verifyPayment(p.id).ok) ok(`Payment for ${o.id} verified`); }}><ShieldCheck size={15} /> Verify — funds received</Button>
                    <Button variant="outline" onClick={() => setRejecting(p.id)}>Reject…</Button>
                  </div>
                </div>
                {rejecting === p.id && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                    <select className="input max-w-sm" value={reason} onChange={(e) => setReason(e.target.value)}>
                      {['Amount not received in PAC account', 'Amount does not match order total', 'Receipt unreadable or altered', 'Duplicate evidence'].map((r) => <option key={r}>{r}</option>)}
                    </select>
                    <Button variant="danger" onClick={() => { if (rejectPayment(p.id, reason).ok) { ok('Payment rejected — customer notified'); setRejecting(null); } }}>Confirm rejection</Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'all' && (
        <Card pad={false}>
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full">
              <thead className="bg-surface-secondary/60"><tr>{['Payment', 'Order', 'Customer', 'Amount due', 'Submitted', 'Method', 'Transaction ref', 'Date', 'Status', 'Verified by'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>
                {P.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="td font-semibold">{p.id}</td><td className="td">{p.orderId}</td><td className="td">{db.customers.find((c) => c.id === p.customerId)?.name}</td>
                    <td className="td font-medium">{naira(p.amountDue)}</td><td className="td">{p.amountSubmitted !== undefined ? naira(p.amountSubmitted) : '—'}</td>
                    <td className="td">{p.method === 'card' ? 'Card' : 'Transfer'}</td><td className="td text-ink-soft">{p.reference}</td><td className="td text-ink-soft">{dateTime(p.createdAt)}</td>
                    <td className="td"><StatusBadge meta={paymentStatusMeta[p.status]} /></td><td className="td text-ink-soft">{p.verifiedBy ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'refunds' && (
        <div className="space-y-3">
          {refunds.length === 0 && <Card><div className="text-sm text-ink-soft">No refunds. Refunds arise from cancellations after payment or from resolving partial/failed deliveries.</div></Card>}
          {refunds.map((p) => (
            <Card key={p.id}>
              <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
                <div><div className="text-[15px] font-bold">{naira(p.refund!.amount)}</div><div>{p.orderId} · {p.id} · {db.customers.find((c) => c.id === p.customerId)?.name}</div><div className="text-ink-soft">{p.refund!.reason} · raised by {p.refund!.by}</div></div>
                {p.refund!.status === 'pending' ? <Button onClick={() => { if (processRefund(p.id).ok) ok('Refund processed'); }}>Approve & process refund</Button> : <Badge tone="success">Refund completed</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
