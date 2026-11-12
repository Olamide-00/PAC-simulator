import { useState } from 'react';
import { Plus, Trash2, Truck, UserX, UserCheck } from 'lucide-react';
import { Badge, Button, Callout, Card, Field, Modal, PageHeader, ok } from '../../components/ui';
import { useDb } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { date, litres } from '../../lib/format';

export default function Drivers() {
  const db = useDb();
  const { setDriverStatus, assignDriverToVehicle, deleteDriver } = useStore.getState();
  const [reason, setReason] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showRemoved, setShowRemoved] = useState(false);
  const drivers = db.drivers.filter((d) => showRemoved || !d.removed);
  const trucks = db.vehicles.filter((v) => !v.removed);

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle="Add drivers, give each one a truck, and suspend or delete them. When you assign a driver to an order, their truck goes with them."
        actions={<><label className="flex items-center gap-2 text-[13px] text-ink-soft"><input type="checkbox" checked={showRemoved} onChange={(e) => setShowRemoved(e.target.checked)} className="accent-[#174B3D]" /> Show deleted</label><Button onClick={() => setAdding(true)}><Plus size={16} /> Add driver</Button></>}
      />
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {drivers.map((d) => {
          const trips = db.trips.filter((t) => t.driverId === d.id);
          const stops = trips.flatMap((t) => t.stops);
          const cur = trips.find((t) => !['completed', 'cancelled'].includes(t.status));
          const v = db.vehicles.find((x) => x.id === d.vehicleId);
          const expSoon = new Date(d.licenceExpiry).getTime() - Date.now() < 60 * 86400000;
          return (
            <Card key={d.id} className={d.removed ? 'opacity-60' : ''}>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-[14px] font-bold text-brand-accent">{d.name.split(' ').map((x) => x[0]).join('')}</div>
                <div className="flex-1"><div className="font-semibold">{d.name}</div><div className="text-[12px] text-ink-soft">{d.id} · {d.phone}</div></div>
                {d.removed ? <Badge tone="neutral">deleted</Badge> : <Badge tone={d.status === 'active' ? 'success' : d.status === 'pending_approval' ? 'warning' : 'error'}>{d.status.replace('_', ' ')}</Badge>}
              </div>

              {!d.removed && (
                <div className="mt-4 rounded-xl border border-line bg-surface-secondary/60 p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-ink-soft"><Truck size={14} /> Assigned truck</div>
                  <select
                    className="input"
                    value={d.vehicleId ?? ''}
                    disabled={!!cur || d.status !== 'active'}
                    onChange={(e) => { const r = assignDriverToVehicle(d.id, e.target.value || null); if (r.ok) ok(e.target.value ? `${d.name} assigned to ${trucks.find((t) => t.id === e.target.value)?.reg}` : `${d.name} unassigned from truck`); }}
                  >
                    <option value="">— No truck —</option>
                    {trucks.map((t) => {
                      const other = db.drivers.find((x) => x.id === t.driverId && x.id !== d.id);
                      return <option key={t.id} value={t.id}>{t.reg} · {litres(t.fuel)} of {litres(t.capacity)} on board{t.status !== 'available' && t.status !== 'assigned' ? ` · ${t.status}` : ''}{other ? ` (now ${other.name})` : ''}</option>;
                    })}
                  </select>
                  <div className="mt-1 text-[11px] text-ink-soft">{cur ? 'Locked while they have deliveries.' : d.status !== 'active' ? 'Only active drivers can be given a truck.' : 'Picking a truck that has another driver moves it to this driver.'}</div>
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-[12.5px]">
                <span className="text-ink-soft">Right now</span><span className="text-right">{!cur ? 'Free' : cur.status === 'in_transit' ? 'On the road' : `${cur.stops.length} delivery(s) waiting`}</span>
                <span className="text-ink-soft">Truck</span><span className="text-right">{v ? `${v.reg} · ${litres(v.fuel)} on board` : '—'}</span>
                <span className="text-ink-soft">Licence</span><span className="text-right">{d.licenceNo}</span>
                <span className="text-ink-soft">Licence expiry</span><span className={`text-right ${expSoon ? 'font-semibold text-status-warning' : ''}`}>{d.licenceExpiry}{expSoon && ' ⚠'}</span>
                <span className="text-ink-soft">Joined</span><span className="text-right">{date(d.joinedAt)}</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1 rounded-lg bg-surface-secondary p-2 text-center text-[11px]">
                <div><div className="text-ink-soft">Trips</div><b>{trips.filter((t) => t.status === 'completed').length}</b></div>
                <div><div className="text-ink-soft">Stops</div><b>{stops.filter((s) => s.status === 'delivered').length}</b></div>
                <div><div className="text-ink-soft">Partial</div><b>{stops.filter((s) => s.status === 'partial').length}</b></div>
                <div><div className="text-ink-soft">Failed</div><b>{stops.filter((s) => s.status === 'failed').length}</b></div>
              </div>

              {!d.removed && (
                <div className="mt-3 space-y-2 border-t border-line pt-3">
                  {d.status === 'pending_approval' && <Button className="w-full" onClick={() => { if (setDriverStatus(d.id, 'active', 'Documents verified').ok) ok(`${d.name} approved`); }}><UserCheck size={15} /> Approve driver</Button>}
                  {d.status === 'active' && (
                    <div className="flex gap-2">
                      <input className="input" placeholder="Reason to suspend" value={reason[d.id] ?? ''} onChange={(e) => setReason({ ...reason, [d.id]: e.target.value })} />
                      <Button variant="outline" disabled={!!cur} onClick={() => { if (setDriverStatus(d.id, 'suspended', reason[d.id] ?? '').ok) ok(`${d.name} suspended — can’t receive deliveries`); }}><UserX size={15} /> Suspend</Button>
                    </div>
                  )}
                  {(d.status === 'suspended' || d.status === 'deactivated') && <Button variant="outline" className="w-full" onClick={() => { if (setDriverStatus(d.id, 'active', 'Reinstated').ok) ok(`${d.name} reactivated`); }}><UserCheck size={15} /> Reactivate</Button>}
                  <button disabled={!!cur} onClick={() => setDeleting(d.id)} className="disabled:opacity-40 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12.5px] font-semibold text-status-error hover:bg-status-error/5"><Trash2 size={14} /> Delete driver</button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {adding && <AddDriver onClose={() => setAdding(false)} />}
      {deleting && <DeleteDriver id={deleting} onClose={() => setDeleting(null)} del={deleteDriver} />}
    </div>
  );
}

function AddDriver({ onClose }: { onClose: () => void }) {
  const db = useDb();
  const addDriver = useStore((s) => s.addDriver);
  const [f, setF] = useState({ name: '', phone: '+234 ', licenceNo: '', licenceExpiry: '', vehicleId: '' });
  return (
    <Modal open onClose={onClose} title="Add driver">
      <div className="space-y-3">
        <Field label="Full name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Chukwuma Eze" /></Field>
        <Field label="Phone number" hint="The driver signs in to the Driver App with this number (OTP)."><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Driver’s licence no."><input className="input" value={f.licenceNo} onChange={(e) => setF({ ...f, licenceNo: e.target.value })} placeholder="LAG-DL-00000" /></Field>
          <Field label="Licence expiry"><input className="input" type="date" value={f.licenceExpiry} onChange={(e) => setF({ ...f, licenceExpiry: e.target.value })} /></Field>
        </div>
        <Field label="Assign to truck (optional)">
          <select className="input" value={f.vehicleId} onChange={(e) => setF({ ...f, vehicleId: e.target.value })}>
            <option value="">— Assign later —</option>
            {db.vehicles.filter((v) => !v.removed).map((v) => <option key={v.id} value={v.id}>{v.reg} · {litres(v.capacity)} tanker{v.driverId ? ` (currently ${db.drivers.find((d) => d.id === v.driverId)?.name})` : ''}</option>)}
          </select>
        </Field>
        <Callout tone="info">In production the driver also uploads ID and licence documents, which PAC reviews before the account goes live.</Callout>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { const r = addDriver({ ...f, vehicleId: f.vehicleId || undefined }); if (r.ok) { ok(`Driver ${r.id} added`); onClose(); } }}>Add driver</Button></div>
      </div>
    </Modal>
  );
}

function DeleteDriver({ id, onClose, del }: { id: string; onClose: () => void; del: (id: string, reason: string) => { ok: boolean } }) {
  const db = useDb();
  const [reason, setReason] = useState('');
  const d = db.drivers.find((x) => x.id === id)!;
  const hasHistory = db.trips.some((t) => t.driverId === id);
  return (
    <Modal open onClose={onClose} title={`Delete ${d.name}?`}>
      <p className="text-[13px] text-ink/80">The driver loses Driver App access immediately and is removed from the truck and from dispatch.</p>
      {hasHistory && <div className="mt-3"><Callout tone="warning">This driver has past trips, so their record is <b>archived</b> rather than erased — delivery history and audit records must be kept. Tick “Show deleted” to see archived drivers.</Callout></div>}
      <div className="mt-3"><Field label="Reason (required — recorded in audit log)"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Contract ended" /></Field></div>
      <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={() => { if (del(id, reason).ok) { ok(`${d.name} deleted`); onClose(); } }}><Trash2 size={15} /> Delete driver</Button></div>
    </Modal>
  );
}
