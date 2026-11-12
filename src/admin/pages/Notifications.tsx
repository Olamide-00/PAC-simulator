import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Badge, Button, Card, PageHeader } from '../../components/ui';
import { useDb } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { dateTime } from '../../lib/format';

export default function Notifications() {
  const db = useDb();
  const markRead = useStore((s) => s.markRead);
  const nav = useNavigate();
  const list = db.notifications.filter((n) => n.audience === 'admin').sort((a, b) => (a.severity === 'critical' ? -1 : 0) - (b.severity === 'critical' ? -1 : 0) || b.at - a.at);
  return (
    <div>
      <PageHeader title="Notifications" subtitle="Generated only by real system events. Critical operational alerts are separated from routine notifications." actions={<Button variant="outline" onClick={() => markRead('admin')}>Mark all as read</Button>} />
      <Card pad={false}>
        <table className="w-full">
          <thead className="bg-surface-secondary/60"><tr>{['', 'ID', 'Type', 'Event', 'Severity', 'Recipient', 'Date & time', ''].map((h, i) => <th key={i} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {list.map((n) => (
              <tr key={n.id} className={clsx('border-t border-line', !n.read && 'bg-[#fffdf7]')}>
                <td className="td w-4">{!n.read && <span className="block h-2 w-2 rounded-full bg-brand-accent" />}</td>
                <td className="td text-ink-soft">{n.id}</td><td className="td font-semibold">{n.type}</td><td className="td max-w-[380px] truncate">{n.message}</td>
                <td className="td"><Badge tone={n.severity === 'critical' ? 'error' : n.severity === 'warning' ? 'warning' : n.severity === 'success' ? 'success' : 'info'}>{n.severity}</Badge></td>
                <td className="td text-ink-soft">Operations staff</td><td className="td text-ink-soft">{dateTime(n.at)}</td>
                <td className="td">{n.link && <button onClick={() => nav(n.link!)} className="text-[12px] font-semibold text-brand-secondary hover:underline">Open record →</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
