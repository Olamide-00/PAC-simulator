import { useState } from 'react';
import { Lock, ShieldX } from 'lucide-react';
import { Badge, Card, PageHeader } from '../../components/ui';
import { useDb } from '../../lib/selectors';
import { dateTime } from '../../lib/format';

export default function AuditLogs() {
  const db = useDb();
  const [q, setQ] = useState('');
  const [deniedOnly, setDeniedOnly] = useState(false);
  const rows = db.audit.filter((a) => (!deniedOnly || a.denied) && [a.actor, a.action, a.record, a.role, a.reason ?? ''].some((v) => v.toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <PageHeader title="Audit logs" subtitle="Append-only record of every sensitive action — including attempts the backend refused. No dashboard user can edit or delete entries." />
      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <input className="input max-w-xs" placeholder="Search actor, action, record…" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={deniedOnly} onChange={(e) => setDeniedOnly(e.target.checked)} className="accent-[#C43D3D]" /> Denied attempts only</label>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-ink-soft"><Lock size={13} /> Read-only · {db.audit.length} entries</span>
        </div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full">
            <thead className="bg-surface-secondary/60"><tr>{['Timestamp', 'User', 'Role', 'Action', 'Affected record', 'Previous value', 'New value', 'Reason'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className={`border-t border-line align-top ${a.denied ? 'bg-status-error/5' : ''}`}>
                  <td className="td text-ink-soft">{dateTime(a.at)}</td><td className="td font-medium">{a.actor}</td><td className="td text-ink-soft">{a.role}</td>
                  <td className="td">{a.denied ? <Badge tone="error"><ShieldX size={11} />{a.action.replace('DENIED: ', 'Denied: ')}</Badge> : <span className="font-semibold">{a.action}</span>}</td>
                  <td className="td">{a.record}</td><td className="td max-w-[160px] truncate text-ink-soft">{a.before ?? '—'}</td><td className="td max-w-[260px] whitespace-normal">{a.after ?? '—'}</td><td className="td max-w-[260px] whitespace-normal text-ink-soft">{a.reason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
