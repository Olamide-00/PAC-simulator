import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

const PHASES = [
  { n: '0', t: 'Discovery & policy sign-off', d: 'Confirm management decisions (pricing, limits, areas, payment policy, POD method, tolerances), final palette, regulatory checks, and integration accounts.', out: ['Signed-off requirements & policy register', 'Integration accounts opened in PAC’s name', 'Final UI designs for key screens'] },
  { n: '1', t: 'Backend core & Admin Dashboard', d: 'Data model, auth & RBAC, orders, payments, inventory ledger, dispatch & trips, audit log, settings — with the Admin Dashboard on top.', out: ['API + database with migrations', 'Admin Dashboard (all 14 modules)', 'Automated tests for business rules'] },
  { n: '2', t: 'Customer App', d: 'Registration & OTP, addresses with maps, ordering, card & transfer payments, tracking, history, notifications, support.', out: ['Android & iOS builds (TestFlight / internal testing)', 'Payment gateway in sandbox'] },
  { n: '3', t: 'Driver App', d: 'Assigned deliveries, accept & start, navigation, GPS, litres + customer code, partial/failed flows, problem reports.', out: ['Android & iOS builds', 'Background GPS validated on target devices'] },
  { n: '4', t: 'Integration hardening & QA', d: 'Live-like staging: webhooks, SMS, push, maps; end-to-end and failure-scenario testing; security review; load test.', out: ['Test evidence for every acceptance test', 'Security & performance report'] },
  { n: '5', t: 'UAT, launch & handover', d: 'PAC staff run real scenarios; app-store submission; go-live; monitoring; training and documentation.', out: ['Live apps & dashboard', 'Source code, credentials, API & ops documentation', 'Staff training'] },
];

const DELIVERABLES = ['Customer app — Android & iOS', 'Driver app — Android & iOS', 'Web Admin Dashboard', 'Backend API & PostgreSQL database', 'Payment, maps/GPS, SMS, push & email integrations', 'Inventory & 5,000 L tanker-capacity logic', 'Driver assignment, multi-stop trips & truck fuel tracking', 'Reports with PDF/Excel export', 'API docs, database schema & status-transition docs', 'Test cases & results', 'Deployment & backup/recovery runbooks', 'Source code, credentials & handover'];

const TESTS = [
  ['Customer registration with phone OTP', null],
  ['Customer selects valid quantity, address and submits', '/customer'],
  ['Subtotal + delivery fee calculated correctly', '/customer'],
  ['Order appears on dashboard without manual transfer', '/demo'],
  ['Uploaded receipt does NOT mark payment verified', '/admin/payments'],
  ['Authorised admin assigns a confirmed order to an approved driver', '/admin/orders'],
  ['Truck can’t be loaded beyond capacity or sent without enough fuel', '/admin/inventory'],
  ['Multiple orders for one driver form one trip, records kept separate', '/admin/orders'],
  ['Customer & admin receive driver location and updates', '/admin/tracking'],
  ['Actual delivered quantity and customer confirmation recorded', '/driver'],
  ['Partial delivery records shortfall, not marked fully delivered', '/driver'],
  ['Each delivery reduces the truck’s fuel; leftovers return to depot', '/admin/inventory'],
  ['Admin cannot act outside assigned permissions', '/admin'],
  ['Driver cannot access finance, prices or inventory', '/driver'],
  ['Accurate filtered reports can be generated', '/admin/reports'],
];

export default function Delivery() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8 max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent-deep">Delivery plan</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">How we get from blueprint to launch</h1>
        <p className="mt-3 text-ink-soft">Mandatory workflows first; policy-dependent features switched on once management confirms them. Timeline per phase is agreed after Phase 0 sign-off.</p>
      </div>

      <ol className="relative space-y-4 border-l-2 border-brand-accent/50 pl-6">
        {PHASES.map((p) => (
          <li key={p.n} className="relative">
            <span className="absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-brand-accent ring-4 ring-surface-secondary">{p.n}</span>
            <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <h3 className="font-bold">Phase {p.n} — {p.t}</h3>
              <p className="mt-1 text-[13px] text-ink/80">{p.d}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{p.out.map((o) => <span key={o} className="rounded-md bg-surface-secondary px-2 py-1 text-[12px] font-medium">{o}</span>)}</div>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-14 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="rounded-2xl bg-brand-primary p-6 text-white">
          <h2 className="text-lg font-bold text-brand-accent">Deliverables</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {DELIVERABLES.map((d) => <li key={d} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-brand-accent" />{d}</li>)}
          </ul>
        </div>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h2 className="text-lg font-bold">Acceptance tests (from the FRS)</h2>
          <p className="mt-1 text-[13px] text-ink-soft">PAC accepts the system only when each is demonstrated with evidence. Most can already be seen in this demo.</p>
          <ol className="mt-4 space-y-1.5 text-[13px]">
            {TESTS.map(([t, to], i) => (
              <li key={i} className="flex items-center justify-between gap-3 border-b border-line/60 pb-1.5 last:border-0">
                <span><span className="mr-2 font-semibold text-ink-soft">{i + 1}.</span>{t}</span>
                {to ? <Link to={to} className="shrink-0 text-xs font-semibold text-brand-secondary hover:underline">See in demo →</Link> : <span className="shrink-0 text-xs text-ink-soft">Production</span>}
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
