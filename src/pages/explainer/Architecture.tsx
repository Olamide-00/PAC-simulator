import { Smartphone, Truck, LayoutDashboard, Server, Database, HardDrive, Zap, Lock, WifiOff, Radio } from 'lucide-react';

const modules = [
  ['Auth & RBAC', 'OTP, sessions, 2FA, roles, action-level permissions'],
  ['Orders', 'Lifecycle, validation, price lock, idempotency'],
  ['Payments', 'Gateway webhooks, transfer verification, refunds'],
  ['Inventory', 'Supplier receipts, depot stock, loading/unloading trucks, reservations'],
  ['Assignment & Trips', 'Assign driver (+ their truck), fuel checks, stops, auto-complete'],
  ['Tracking', 'GPS ingest, staleness, ETA, privacy filtering'],
  ['Notifications', 'Push, SMS, email, in-app; dedupe'],
  ['Reports', 'Operational & financial aggregates, PDF/Excel export'],
  ['Audit', 'Append-only log of every sensitive action'],
  ['Settings', 'Prices, limits, areas, hours, tolerances'],
];

const stack = [
  ['Customer & Driver apps', 'React Native (Expo) + TypeScript', 'One codebase ships both Android and iOS for each app; shares types/validation with the backend; strong maps, background-location and push support.'],
  ['Admin Dashboard', 'React + TypeScript (Next.js or Vite)', 'Data-dense tables, charts and maps; same language as mobile and API — this demo is built on the same foundation.'],
  ['Backend API', 'Node.js (NestJS) — modular monolith', 'Clear module boundaries (orders, payments, dispatch…) without microservice overhead for a launch-size team. Splits cleanly later if needed.'],
  ['Database', 'PostgreSQL', 'ACID transactions keep stock, payments and trips consistent; row-level locks prevent the same litres being allocated twice.'],
  ['Cache & jobs', 'Redis + BullMQ', 'OTP throttling, rate limits, background jobs (webhooks, notifications, report exports), GPS fan-out.'],
  ['Realtime', 'WebSockets (Socket.IO)', 'Pushes order, trip and GPS updates to dashboard & apps instantly; channels scoped per role/order for privacy.'],
  ['File storage', 'S3-compatible (AWS S3 / Cloudflare R2)', 'Payment receipts, proof-of-delivery photos, driver & vehicle documents — private buckets, signed URLs.'],
  ['Hosting', 'AWS (af-south-1, Cape Town) or equivalent', 'Lowest-latency major cloud region to Lagos; managed Postgres with point-in-time recovery.'],
  ['Observability', 'Sentry + uptime monitoring + structured logs', 'Crash/error reporting on all three apps and API; alerts on webhook or GPS ingestion failures.'],
  ['CI/CD', 'GitHub Actions + EAS Build', 'Automated tests, staging environment, app-store builds and over-the-air updates for the mobile apps.'],
];

const entities = [
  ['Customer', 'id, name, phone (unique, verified), email, category, status', '1—n Address, Order, Complaint'],
  ['Address', 'label, line, area, landmark, instructions, lat/lng', 'snapshotted into Order on submit'],
  ['Product', 'code (PMS), name, active', 'extensible to AGO/DPK later'],
  ['PriceVersion', 'product, unit price, delivery fee, effective_from, set_by', 'Order keeps the version it was priced with'],
  ['Order', 'ref, qty, unit price, fee, total, status, delivery OTP', 'n—1 Customer · 1—1 Payment · 0..1 Stop'],
  ['Payment', 'ref, method, amount due/submitted, status, evidence, verified_by', '1—n Refund'],
  ['Vehicle', 'reg, capacity (5,000 L), fuel on board, status', '1—n Trip, 1 Driver'],
  ['Driver', 'licence, status, assigned truck', '1—n Trip'],
  ['Trip', 'ref, litres allocated, status (assigned → accepted → on the road → completed)', '1—n Stop · 1 Vehicle · 1 Driver'],
  ['Stop', 'seq, ordered, delivered, status, reason, POD', '1—1 Order'],
  ['StockMovement', 'type (receipt/load/unload), signed qty, truck, by', 'ledger — depot stock is the sum, never overwritten'],
  ['GpsPing', 'trip, lat/lng, accuracy, recorded_at, received_at', 'time-series; latest cached in Redis'],
  ['Notification / AuditLog', 'actor, action, record, before, after, reason', 'append-only'],
];

export default function Architecture() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8 max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent-deep">Technical architecture</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">How the system is put together</h1>
        <p className="mt-3 text-ink-soft">Three thin clients on top of one authoritative backend. Business rules live on the server so they hold no matter which app — or which attacker — sends the request.</p>
      </div>

      {/* Diagram */}
      <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-8">
        <div className="grid gap-3 sm:grid-cols-3">
          {[[Smartphone, 'Customer App', 'Android · iOS'], [Truck, 'Driver App', 'Android · iOS · offline queue'], [LayoutDashboard, 'Admin Dashboard', 'Web · desktop & tablet']].map(([I, t, d]: any) => (
            <div key={t} className="flex items-center gap-3 rounded-xl border border-line bg-surface-secondary/60 p-4">
              <I size={22} className="text-brand-secondary" /><div><div className="font-semibold">{t}</div><div className="text-xs text-ink-soft">{d}</div></div>
            </div>
          ))}
        </div>
        <div className="my-3 flex justify-center gap-10 text-xs font-medium text-ink-soft"><span>HTTPS / REST</span><span>⇅</span><span>WebSocket (realtime)</span></div>
        <div className="rounded-2xl bg-brand-primary p-5 text-white">
          <div className="mb-3 flex items-center gap-2 font-semibold"><Server size={18} className="text-brand-accent" /> PAC Petrol API — central backend <span className="ml-auto rounded bg-white/10 px-2 py-0.5 text-[11px] font-medium">Auth · validation · RBAC · audit on every request</span></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {modules.map(([m, d]) => (
              <div key={m} className="rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
                <div className="text-[13px] font-semibold text-brand-accent">{m}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-white/65">{d}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="my-3 flex justify-center text-ink-soft">⇅</div>
        <div className="grid gap-3 sm:grid-cols-4">
          {[[Database, 'PostgreSQL', 'System of record'], [Zap, 'Redis / BullMQ', 'Cache, queues, rate limits'], [HardDrive, 'Object storage', 'Receipts, POD, documents'], [Radio, 'External services', 'Payments, maps, SMS, push, email']].map(([I, t, d]: any) => (
            <div key={t} className="flex items-center gap-3 rounded-xl border border-line p-3.5">
              <I size={20} className="text-brand-accent-deep" /><div><div className="text-sm font-semibold">{t}</div><div className="text-xs text-ink-soft">{d}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* Stack */}
      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight">Recommended technology stack</h2>
        <p className="mt-2 max-w-3xl text-ink-soft">A single language (TypeScript) across all three apps and the API keeps the team small, lets validation rules be shared, and makes handover easier.</p>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface-secondary"><tr><th className="th">Layer</th><th className="th">Choice</th><th className="th">Why</th></tr></thead>
            <tbody>
              {stack.map(([l, c, w]) => (
                <tr key={l} className="border-t border-line align-top"><td className="px-3 py-3 font-semibold">{l}</td><td className="px-3 py-3 font-medium text-brand-secondary">{c}</td><td className="px-3 py-3 text-[13px] text-ink/80">{w}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Data model */}
      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight">Core data model</h2>
        <p className="mt-2 max-w-3xl text-ink-soft">Records are never silently overwritten: stock is a ledger of movements, prices are versioned, and orders snapshot their address and price at the moment they are placed.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entities.map(([e, f, r]) => (
            <div key={e} className="rounded-xl border border-line bg-white p-4 shadow-card">
              <div className="font-mono text-sm font-bold text-brand-primary">{e}</div>
              <div className="mt-1 text-[12px] text-ink/80">{f}</div>
              <div className="mt-2 border-t border-line pt-2 text-[11px] font-medium text-brand-accent-deep">{r}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Flow + security */}
      <section className="mt-14 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h3 className="text-lg font-bold">Realtime event flow — “driver records a delivery”</h3>
          <ol className="mt-4 space-y-3 text-[13px]">
            {[
              ['Driver App', 'POST /trips/:id/stops/:id/deliver { qty, otp, eventId }'],
              ['API', 'Auth → is this driver assigned to this trip? → qty ≤ allocation → OTP matches order'],
              ['Database', 'Single transaction: update stop, order status, delivered qty, audit row'],
              ['Event bus', 'stop.delivered published once (eventId makes retries idempotent)'],
              ['WebSocket', 'Admin dashboard + that customer only receive the update'],
              ['Push / SMS', 'Customer notified; partial/failed raises an ops alert'],
            ].map(([who, what], i) => (
              <li key={i} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-[11px] font-bold text-brand-accent">{i + 1}</span><div><span className="font-semibold">{who}: </span><span className="text-ink/80">{what}</span></div></li>
            ))}
          </ol>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h3 className="flex items-center gap-2 text-lg font-bold"><Lock size={18} className="text-brand-secondary" /> Security & data protection</h3>
            <ul className="mt-3 space-y-1.5 text-[13px] text-ink/85">
              {['TLS everywhere; data encrypted at rest', 'Argon2/bcrypt password hashing; phone OTP with expiry & attempt limits', 'Short-lived access tokens + rotating refresh tokens; admin 2FA (TOTP)', 'RBAC enforced in API middleware — hidden buttons are never the control', 'Customers scoped to their own records; drivers to their assigned stops', 'Append-only audit log; staff cannot edit or delete entries', 'Designed for the Nigeria Data Protection Act 2023 (NDPA): consent, retention, access requests', 'Daily backups with point-in-time recovery and a tested restore procedure'].map((x) => <li key={x} className="flex gap-2"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-accent" />{x}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h3 className="flex items-center gap-2 text-lg font-bold"><WifiOff size={18} className="text-brand-secondary" /> Driver offline mode</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink/85">Trip details are cached on the device. Permitted events (arrival, delivery, incident drafts) are queued locally with a unique event ID and shown as <b>“Pending sync”</b> — never as confirmed. On reconnect the server validates each event; conflicts with later management changes are flagged for review instead of silently overwriting.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
