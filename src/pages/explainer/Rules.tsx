import { Check, Minus } from 'lucide-react';
import { rolePermissions, type Permission } from '../../lib/permissions';
import { roleLabel } from '../../lib/format';
import type { Role } from '../../lib/types';
import { Callout } from '../../components/ui';

const RULES: { group: string; items: string[] }[] = [
  { group: 'Orders', items: ['Every order belongs to an authenticated customer and has a unique reference', 'Prices and fees are retrieved and validated by the backend', 'Orders are never auto-confirmed on receipt — confirmation requires passing checks', 'A confirmed order’s price is never silently changed', 'Duplicate submissions are blocked with idempotency keys', 'Editing a saved address never changes an existing order’s destination'] },
  { group: 'Payments', items: ['Uploaded evidence ≠ verified payment', 'Only Finance or a verified gateway webhook can mark a payment Verified', 'Drivers can view payment status but never verify or change it', 'Verified revenue uses verified records only, net of refunds', 'Every refund links to the original payment and order, with reason and approver'] },
  { group: 'Drivers, trucks & delivery', items: ['A driver can only be assigned after the order is confirmed', 'The delivery goes out on the truck the driver is assigned to', 'The truck must have enough fuel on board for all its assigned deliveries', 'Suspended drivers and trucks in maintenance/suspended can’t be used', 'Several orders for the same driver become one trip with separate stops', 'Delivery is only recorded with the actual litres + the customer’s code', 'Partial and failed deliveries are recorded separately and never auto-resolved', 'Drivers or trucks with past trips are archived, not erased, when deleted'] },
  { group: 'Fuel & inventory', items: ['Every litre is a ledger movement: supplier → depot → truck → customer', 'A truck can never hold more than its capacity (5,000 L)', 'Each delivery reduces the fuel on that truck automatically', 'Leftover fuel is unloaded back to the depot — a truck can’t be deleted with fuel on board', 'Litres promised to confirmed orders are never sold twice'] },
  { group: 'Access & accountability', items: ['Role-based access enforced by the backend — not by hiding buttons', 'Every sensitive action is audited with actor, before/after values and reason', 'Ordinary users cannot edit or delete audit logs', 'Customers see only their own data; drivers only their assigned stops'] },
];

const MATRIX: { area: string; view: Permission; act: Permission; actLabel: string }[] = [
  { area: 'Orders', view: 'orders.view', act: 'orders.confirm', actLabel: 'confirm / cancel' },
  { area: 'Payments', view: 'payments.view', act: 'payments.verify', actLabel: 'verify / reject' },
  { area: 'Refunds', view: 'payments.view', act: 'payments.refund', actLabel: 'process' },
  { area: 'Assign drivers to orders', view: 'dispatch.view', act: 'dispatch.create', actLabel: 'assign / change driver' },
  { area: 'Fuel into trucks', view: 'inventory.view', act: 'inventory.load', actLabel: 'load / unload truck' },
  { area: 'Depot stock', view: 'inventory.view', act: 'inventory.receive', actLabel: 'record supplier delivery' },
  { area: 'Drivers & trucks', view: 'drivers.view', act: 'drivers.manage', actLabel: 'add / suspend / delete / pair' },
  { area: 'Customers', view: 'customers.view', act: 'customers.suspend', actLabel: 'suspend' },
  { area: 'Complaints', view: 'complaints.view', act: 'complaints.manage', actLabel: 'resolve' },
  { area: 'Pricing & settings', view: 'settings.view', act: 'pricing.manage', actLabel: 'change' },
  { area: 'Audit logs', view: 'audit.view', act: 'audit.view', actLabel: 'view only' },
];

const DECISIONS = [
  ['Approved selling price per litre & delivery fee', 'Every price shown and charged', '₦1,000/L · ₦5,000 (illustrative)'],
  ['Minimum & maximum order quantity', 'Order validation, presets', '5 L – 5,000 L'],
  ['Approved delivery areas', 'Service-area check before ordering', '11 Lagos areas'],
  ['Operating hours & delivery windows', 'Availability and scheduling options', 'Mon–Sat 07:00–19:00'],
  ['Payment methods; payment before confirmation?', 'Checkout options, confirmation gate', 'Card + transfer; pay first'],
  ['Payment on delivery permitted?', 'Driver payment flows, cash risk', 'Disabled until approved'],
  ['Cancellation & refund policy', 'Who can cancel, when, and refund amounts', 'Customer before dispatch'],
  ['Partial-delivery & outstanding balance policy', 'Refund vs redelivery decisions', 'Manager chooses per case'],
  ['Proof-of-delivery method', 'Driver completion step', 'Customer 4-digit OTP'],
  ['Quantity measurement method (meter/dip)', 'How delivered litres are verified', 'Driver-entered + OTP'],
  ['Driver ↔ customer contact policy', 'Phone visibility / masked calls', 'Assigned driver sees number'],
  ['GPS tracking policy (interval, visibility)', 'Tracking, privacy, battery', 'Active trips only; stale after 45 s'],
  ['Pre-departure safety checklist (optional)', 'Whether drivers tick safety checks before “Start trip”', 'Off — kept simple'],
  ['Regulatory approvals (NMDPRA, tanker spec, insurance, fire safety)', 'Launch readiness — legal', 'To be validated by PAC'],
];

const roles: Role[] = ['super_admin', 'operations', 'finance', 'inventory', 'support'];

export default function Rules() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8 max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent-deep">Business rules & governance</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">The rules the backend enforces</h1>
        <p className="mt-3 text-ink-soft">These come straight from PAC Petrol’s specifications. In the live demo, try breaking them — overloading the tanker, verifying a payment as Support, closing an unbalanced trip — and watch the system refuse and log the attempt.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {RULES.map((g) => (
          <div key={g.group} className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h3 className="font-bold text-brand-primary">{g.group}</h3>
            <ul className="mt-3 space-y-2 text-[13px]">
              {g.items.map((i) => <li key={i} className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-status-success" />{i}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight">Roles & permissions</h2>
        <p className="mt-2 max-w-3xl text-ink-soft">Five staff roles with action-level permissions. A user may view a record without being allowed to act on it. Switch roles in the Admin Dashboard header to experience each one.</p>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-surface-secondary">
              <tr><th className="th">Area</th>{roles.map((r) => <th key={r} className="th text-center">{roleLabel[r]}</th>)}</tr>
            </thead>
            <tbody>
              {MATRIX.map((m) => (
                <tr key={m.area} className="border-t border-line">
                  <td className="px-3 py-2.5 font-medium">{m.area}<div className="text-[11px] font-normal text-ink-soft">action: {m.actLabel}</div></td>
                  {roles.map((r) => {
                    const v = rolePermissions[r].includes(m.view);
                    const a = rolePermissions[r].includes(m.act);
                    return (
                      <td key={r} className="px-3 py-2.5 text-center text-[12px]">
                        {a && m.view !== m.act ? <span className="inline-flex items-center gap-1 rounded-full bg-status-success/10 px-2 py-0.5 font-semibold text-status-success"><Check size={12} />View + act</span>
                          : v ? <span className="inline-flex items-center gap-1 rounded-full bg-status-info/10 px-2 py-0.5 font-semibold text-status-info">View</span>
                          : <Minus size={14} className="mx-auto text-ink-soft/50" />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-soft">Drivers and customers are separate user types with their own apps and no dashboard access. Only the Super Admin can create staff accounts and change permissions.</p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight">Decisions PAC Petrol management must make</h2>
        <p className="mt-2 max-w-3xl text-ink-soft">The documents are clear: the developer must not invent these policies. Each is built as a configurable setting; the demo uses a placeholder value so the flows can be shown.</p>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface-secondary"><tr><th className="th">Decision</th><th className="th">What it affects</th><th className="th">Demo placeholder</th></tr></thead>
            <tbody>
              {DECISIONS.map(([d, a, v]) => (
                <tr key={d} className="border-t border-line"><td className="px-3 py-2.5 font-medium">{d}</td><td className="px-3 py-2.5 text-[13px] text-ink/80">{a}</td><td className="px-3 py-2.5"><span className="rounded-md bg-[#fbf7ec] px-2 py-0.5 text-[12px] font-medium text-brand-accent-deep ring-1 ring-brand-accent/40">{v}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5">
          <Callout tone="warning" title="Safety gate">
            Petrol is highly flammable. A customer-entered address is not automatically a safe or authorised delivery location. Drivers can stop an unsafe operation and report it, and the app never
            forces a delivery to complete. Applicable Nigerian regulatory requirements (petroleum transport & delivery, tanker specification, metering, driver training, insurance, fire protection)
            must be validated by PAC Petrol before launch.
          </Callout>
        </div>
      </section>
    </div>
  );
}
