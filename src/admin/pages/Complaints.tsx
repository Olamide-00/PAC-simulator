import { useState } from 'react';
import clsx from 'clsx';
import { Badge, Button, Card, Field, PageHeader, ok } from '../../components/ui';
import { useDb } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { dateTime } from '../../lib/format';
import type { Complaint } from '../../lib/types';

const STATUSES: Complaint['status'][] = ['submitted', 'received', 'under_review', 'awaiting_customer', 'resolved', 'closed'];

export default function Complaints() {
  const db = useDb();
  const updateComplaint = useStore((s) => s.updateComplaint);
  const [sel, setSel] = useState<string | undefined>(db.complaints[0]?.id);
  const [status, setStatus] = useState<Complaint['status']>('under_review');
  const [note, setNote] = useState('');
  const [internal, setInternal] = useState(false);
  const c = db.complaints.find((x) => x.id === sel);

  return (
    <div>
      <PageHeader title="Complaints & support" subtitle="Receive, investigate and resolve customer complaints. Support staff cannot modify payment or dispatch records without the relevant authorisation." />
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card pad={false}>
          {db.complaints.map((x) => (
            <button key={x.id} onClick={() => { setSel(x.id); setStatus(x.status); }} className={clsx('block w-full border-b border-line px-4 py-3 text-left last:border-0', sel === x.id && 'bg-brand-secondary/5')}>
              <div className="flex items-center justify-between"><span className="text-[13px] font-semibold">{x.id} · {x.category}</span><Badge tone={x.priority === 'high' ? 'error' : x.priority === 'medium' ? 'warning' : 'neutral'}>{x.priority}</Badge></div>
              <div className="mt-0.5 text-[12px] text-ink-soft">{db.customers.find((cc) => cc.id === x.customerId)?.name} · {x.orderId ?? 'no order'} · {dateTime(x.createdAt)}</div>
              <div className="mt-1"><Badge tone={['resolved', 'closed'].includes(x.status) ? 'success' : 'warning'}>{x.status.replace('_', ' ')}</Badge></div>
            </button>
          ))}
        </Card>
        {c && (
          <Card title={`${c.id} — ${c.category}`}>
            <div className="text-[13px] text-ink-soft">{db.customers.find((cc) => cc.id === c.customerId)?.name} · related order {c.orderId ?? '—'} · assigned to {c.assignedTo ?? 'unassigned'}</div>
            <div className="mt-3 rounded-xl bg-surface-secondary p-4 text-[14px]">“{c.message}”</div>
            <div className="mt-4 space-y-2">
              {c.notes.map((n, i) => (
                <div key={i} className={clsx('rounded-lg border p-3 text-[13px]', n.internal ? 'border-brand-accent/50 bg-[#fbf7ec]' : 'border-line')}>
                  <div className="text-[11px] text-ink-soft">{n.internal ? 'Internal note' : 'Reply to customer'} · {n.by} · {dateTime(n.at)}</div>{n.text}
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 border-t border-line pt-4 md:grid-cols-[200px_1fr]">
              <Field label="Status"><select className="input" value={status} onChange={(e) => setStatus(e.target.value as Complaint['status'])}>{STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></Field>
              <Field label="Note / reply"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Investigation finding or message to customer" /></Field>
            </div>
            <label className="mt-2 flex items-center gap-2 text-[13px]"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-[#174B3D]" /> Internal note (not visible to customer)</label>
            <Button className="mt-3" onClick={() => { if (updateComplaint(c.id, status, note, internal).ok) { ok('Ticket updated'); setNote(''); } }}>Update ticket</Button>
          </Card>
        )}
      </div>
    </div>
  );
}
