import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Plus, Trash2, UserRound, Fuel } from 'lucide-react';
import { Badge, Button, Callout, Card, Field, Modal, PageHeader, ProgressBar, ok } from '../../components/ui';
import { useDb } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { litres } from '../../lib/format';
import type { Vehicle } from '../../lib/types';

const STATUS: Record<Vehicle['status'], { label: string; tone: 'success' | 'error' | 'info' | 'warning' }> = {
  available: { label: 'Available', tone: 'success' }, assigned: { label: 'Deliveries waiting', tone: 'info' }, on_trip: { label: 'On the road', tone: 'info' },
  maintenance: { label: 'In maintenance', tone: 'warning' }, unavailable: { label: 'Unavailable', tone: 'error' }, suspended: { label: 'Suspended', tone: 'error' },
};

export default function Vehicles() {
  const db = useDb();
  const { setVehicleStatus, deleteVehicle } = useStore.getState();
  const [why, setWhy] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showRemoved, setShowRemoved] = useState(false);

  return (
    <div>
      <PageHeader
        title="Vehicles"
        subtitle="Add and manage PAC’s tanker trucks. Fuel is put into a truck on the Fuel & Inventory page; the driver for each truck is chosen on the Drivers page."
        actions={<><label className="flex items-center gap-2 text-[13px] text-ink-soft"><input type="checkbox" checked={showRemoved} onChange={(e) => setShowRemoved(e.target.checked)} className="accent-[#174B3D]" /> Show deleted</label><Button onClick={() => setAdding(true)}><Plus size={16} /> Add truck</Button></>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {db.vehicles.filter((v) => showRemoved || !v.removed).map((v) => {
          const trip = db.trips.find((t) => t.vehicleId === v.id && !['completed', 'cancelled'].includes(t.status));
          const driver = db.drivers.find((d) => d.id === v.driverId);
          const hist = db.trips.filter((t) => t.vehicleId === v.id && t.status === 'completed');
          const st = STATUS[v.status];
          return (
            <Card key={v.id} className={v.removed ? 'opacity-60' : ''}>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary text-brand-accent"><Truck size={22} /></div>
                <div className="flex-1"><div className="text-[15px] font-bold">{v.reg}</div><div className="text-[12px] text-ink-soft">{v.id} · {v.type} · {litres(v.capacity)}</div></div>
                {v.removed ? <Badge tone="neutral">deleted</Badge> : <Badge tone={st.tone}>{st.label}</Badge>}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-surface-secondary/60 p-3">
                  <div className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-soft"><Fuel size={14} /> Fuel on board</div>
                  <div className="mt-1 text-xl font-bold">{litres(v.fuel)} <span className="text-[12px] font-normal text-ink-soft">/ {litres(v.capacity)}</span></div>
                  <div className="mt-1.5"><ProgressBar value={v.fuel} max={v.capacity} tone="gold" /></div>
                  {!v.removed && <Link to="/admin/inventory" className="mt-2 inline-block text-[12px] font-semibold text-brand-secondary hover:underline">Load / unload fuel →</Link>}
                </div>
                <div className="rounded-xl border border-line bg-surface-secondary/60 p-3">
                  <div className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-soft"><UserRound size={14} /> Driver</div>
                  <div className="mt-1 text-[15px] font-bold">{driver?.name ?? 'No driver'}</div>
                  <div className="text-[12px] text-ink-soft">{trip ? (trip.status === 'in_transit' ? `On the road · ${trip.id}` : `${trip.stops.length} delivery(s) waiting`) : `${hist.length} trips completed`}</div>
                  {!v.removed && <Link to="/admin/drivers" className="mt-2 inline-block text-[12px] font-semibold text-brand-secondary hover:underline">Change on Drivers page →</Link>}
                </div>
              </div>

              {!v.removed && !trip && (
                <div className="mt-4 space-y-2 border-t border-line pt-3">
                  <div className="flex flex-wrap gap-2">
                    <input className="input max-w-[220px]" placeholder="Reason (e.g. tyre change)" value={why[v.id] ?? ''} onChange={(e) => setWhy({ ...why, [v.id]: e.target.value })} />
                    {(['available', 'maintenance', 'suspended'] as Vehicle['status'][]).filter((s) => s !== v.status).map((s) => (
                      <Button key={s} size="sm" variant={s === 'available' ? 'primary' : 'outline'} onClick={() => { if (setVehicleStatus(v.id, s, why[v.id] || (s === 'available' ? 'Back in service' : '')).ok) ok(`${v.reg}: ${STATUS[s].label}`); }}>
                        {s === 'available' ? 'Put back in service' : s === 'suspended' ? 'Suspend' : 'Send to maintenance'}
                      </Button>
                    ))}
                  </div>
                  <button onClick={() => setDeleting(v.id)} className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12.5px] font-semibold text-status-error hover:bg-status-error/5"><Trash2 size={14} /> Delete truck</button>
                </div>
              )}
              {trip && <div className="mt-3 text-[11.5px] text-ink-soft">Status changes and deletion are locked while the truck has deliveries.</div>}
            </Card>
          );
        })}
      </div>
      <div className="mt-4"><Callout tone="info">A truck in maintenance or suspended can’t be used for deliveries. To delete a truck, unload its fuel back to the depot first, so no litres go missing.</Callout></div>

      {adding && <AddTruck onClose={() => setAdding(false)} />}
      {deleting && <DeleteTruck id={deleting} onClose={() => setDeleting(null)} del={deleteVehicle} />}
    </div>
  );
}

function AddTruck({ onClose }: { onClose: () => void }) {
  const addVehicle = useStore((s) => s.addVehicle);
  const [reg, setReg] = useState('');
  const [cap, setCap] = useState('5000');
  return (
    <Modal open onClose={onClose} title="Add truck">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Registration number"><input className="input" value={reg} onChange={(e) => setReg(e.target.value)} placeholder="KJA 120 XB" /></Field>
          <Field label="Tank capacity (L)"><input className="input" type="number" value={cap} onChange={(e) => setCap(e.target.value)} /></Field>
        </div>
        <p className="text-[12px] text-ink-soft">The truck starts empty. Next: give it a driver on the Drivers page, and load fuel on the Fuel & Inventory page.</p>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { const r = addVehicle(reg, parseInt(cap, 10)); if (r.ok) { ok(`Truck ${r.id} added`); onClose(); } }}>Add truck</Button></div>
      </div>
    </Modal>
  );
}

function DeleteTruck({ id, onClose, del }: { id: string; onClose: () => void; del: (id: string, reason: string) => { ok: boolean } }) {
  const db = useDb();
  const [reason, setReason] = useState('');
  const v = db.vehicles.find((x) => x.id === id)!;
  const hasHistory = db.trips.some((t) => t.vehicleId === id);
  return (
    <Modal open onClose={onClose} title={`Delete ${v.reg}?`}>
      <p className="text-[13px] text-ink/80">The truck is removed from the fleet and its driver is unassigned.</p>
      {v.fuel > 0 && <div className="mt-3"><Callout tone="error">It still has {litres(v.fuel)} on board. Unload it on the Fuel & Inventory page first.</Callout></div>}
      {hasHistory && <div className="mt-3"><Callout tone="warning">This truck has past trips, so it is <b>archived</b> rather than erased — delivery history must be kept. Tick “Show deleted” to see it.</Callout></div>}
      <div className="mt-3"><Field label="Reason (saved in the audit log)"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Sold" /></Field></div>
      <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={() => { if (del(id, reason).ok) { ok(`${v.reg} deleted`); onClose(); } }}><Trash2 size={15} /> Delete truck</Button></div>
    </Modal>
  );
}
