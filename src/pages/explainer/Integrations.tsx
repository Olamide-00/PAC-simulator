import { CreditCard, Landmark, Map, Navigation, BellRing, MessageSquareText, Mail, HardDrive, Activity, PhoneCall, FileSpreadsheet, Store } from 'lucide-react';
import { Badge, Callout } from '../../components/ui';

const items = [
  { icon: CreditCard, name: 'Payment gateway', purpose: 'Card, bank and USSD payments inside the Customer App.', provider: 'Paystack', alt: 'Flutterwave, Monnify', apps: 'Customer App · Backend', how: 'App opens the gateway checkout; the backend creates the transaction and only marks it Verified after a signed webhook confirms the exact amount. The phone is never trusted to say “paid”.', needs: 'CAC business registration, settlement bank account, live API keys, webhook URL', demo: 'Simulated' },
  { icon: Landmark, name: 'Bank transfer verification', purpose: 'Confirm transfers actually reached PAC’s account.', provider: 'Dedicated virtual accounts (Paystack DVA or Monnify reserved accounts)', alt: 'Manual Finance verification against bank statement (spec baseline)', apps: 'Admin Dashboard (Finance) · Backend', how: 'Recommended upgrade: each customer gets a unique account number; incoming transfers are matched automatically by webhook, removing receipt screenshots. Until approved, Finance verifies each receipt manually — exactly as shown in the demo.', needs: 'Management decision on payment policy; provider onboarding', demo: 'Manual flow live in demo' },
  { icon: Map, name: 'Maps, places & geocoding', purpose: 'Address search, pin-drop, service-area checks, map display.', provider: 'Google Maps Platform (Maps SDK, Places Autocomplete, Geocoding)', alt: 'Mapbox', apps: 'All three apps', how: 'Customers search or drop a pin; coordinates are stored with the address. The backend checks the point against configured service-area polygons before accepting an order.', needs: 'Google Cloud billing account, restricted API keys per app', demo: 'Schematic map' },
  { icon: Navigation, name: 'Routing, ETA & optimisation', purpose: 'Turn-by-turn navigation, stop ordering, estimated arrival.', provider: 'Google Routes API (waypoint optimisation, traffic-aware ETA)', alt: 'Mapbox Directions, OSRM', apps: 'Admin (trip builder) · Driver App · Customer tracking', how: 'Trip builder suggests a stop sequence that the manager can accept or override. Driver taps “Navigate” to hand off to Google Maps/Waze. ETA is shown labelled as an estimate and hidden when GPS is stale.', needs: 'Same Google Cloud account', demo: 'Simulated' },
  { icon: Navigation, name: 'Device GPS', purpose: 'Live tanker location during active trips only.', provider: 'Native location services (expo-location background task / Android foreground service)', alt: '—', apps: 'Driver App → Backend → Admin & Customer', how: 'Location is sent at a configurable interval only while a trip is active, with accuracy and timestamp. Backend classifies Live / Stale / Offline / Permission-denied.', needs: 'Driver consent & communicated tracking policy (management decision)', demo: 'Simulated with GPS-loss controls' },
  { icon: BellRing, name: 'Push notifications', purpose: 'Assignment alerts, order updates, delivery progress.', provider: 'Firebase Cloud Messaging (Android + iOS via APNs)', alt: 'Expo Push, OneSignal', apps: 'Customer App · Driver App', how: 'Every push is triggered by a real backend event and deep-links into the relevant order or trip. Duplicate events are suppressed.', needs: 'Firebase project, Apple Push key', demo: 'In-app notifications live' },
  { icon: MessageSquareText, name: 'SMS & OTP', purpose: 'Phone verification, password reset, fallback alerts.', provider: 'Termii (Nigeria; DND-safe OTP route)', alt: "Africa's Talking, Twilio Verify", apps: 'Customer App · Driver App', how: 'OTPs expire, are rate-limited per number and validated server-side. Transactional route avoids NCC Do-Not-Disturb blocking.', needs: 'Sender ID registration, prepaid SMS balance', demo: 'Not simulated' },
  { icon: Mail, name: 'Email', purpose: 'Receipts, staff alerts, report delivery.', provider: 'Amazon SES or Resend', alt: 'ZeptoMail, SendGrid', apps: 'Backend', how: 'Branded transactional templates; verified PAC domain (SPF/DKIM).', needs: 'PAC domain DNS access', demo: 'Not simulated' },
  { icon: HardDrive, name: 'File storage', purpose: 'Transfer receipts, proof-of-delivery, driver & vehicle documents.', provider: 'AWS S3 / Cloudflare R2', alt: 'Cloudinary', apps: 'All', how: 'Private buckets; files accessed only through short-lived signed URLs and role checks.', needs: 'Cloud account', demo: 'Not simulated' },
  { icon: PhoneCall, name: 'Masked calling (optional)', purpose: 'Driver ↔ customer calls without exposing numbers.', provider: "Africa's Talking Voice", alt: 'Twilio Proxy', apps: 'Driver App · Customer App', how: 'Only if management chooses a masked-contact policy; otherwise the registered number is shown to the assigned driver only.', needs: 'Management decision', demo: '—' },
  { icon: FileSpreadsheet, name: 'Report export', purpose: 'PDF and Excel reports.', provider: 'Server-side PDF rendering + ExcelJS', alt: '—', apps: 'Admin Dashboard', how: 'Exports respect the requester’s permissions and stamp the reporting period and generation time.', needs: '—', demo: 'CSV export live' },
  { icon: Activity, name: 'Monitoring', purpose: 'Crash reports, uptime and alerting.', provider: 'Sentry + uptime monitor', alt: 'Datadog, Grafana', apps: 'All', how: 'Alerts when webhooks fail, GPS ingestion stops or error rates spike.', needs: '—', demo: '—' },
];

export default function Integrations() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8 max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent-deep">Third-party integrations</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">What we connect to — and why</h1>
        <p className="mt-3 text-ink-soft">Each integration is chosen for the Nigerian market, sits behind the backend (apps never hold secret keys) and is tested in a staging environment before going live.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((it) => (
          <div key={it.name} className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary text-brand-accent"><it.icon size={19} /></span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold">{it.name}</h3>
                  <Badge tone={it.demo.startsWith('Simulated') || it.demo.includes('live') ? 'brand' : 'neutral'}>Demo: {it.demo}</Badge>
                </div>
                <p className="text-[13px] text-ink-soft">{it.purpose}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-x-4 gap-y-2 text-[13px] sm:grid-cols-[110px_1fr]">
              <span className="text-ink-soft">Recommended</span><span className="font-semibold text-brand-secondary">{it.provider}</span>
              <span className="text-ink-soft">Alternatives</span><span>{it.alt}</span>
              <span className="text-ink-soft">Used by</span><span>{it.apps}</span>
              <span className="text-ink-soft">How it works</span><span className="leading-relaxed text-ink/85">{it.how}</span>
              <span className="text-ink-soft">PAC to provide</span><span>{it.needs}</span>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-14 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h3 className="text-lg font-bold">Card payment — verified by webhook</h3>
          <ol className="mt-4 space-y-2 text-[13px]">
            {['Customer taps Pay → backend creates transaction with exact amount & order reference', 'Gateway checkout shown in-app; customer authorises (OTP/3-DS)', 'Gateway calls PAC webhook; backend verifies signature, reference and amount', 'Payment → Verified; order moves to operational confirmation', 'Customer App and Dashboard update in real time'].map((x, i) => <li key={i} className="flex gap-3"><span className="font-bold text-brand-accent-deep">{i + 1}.</span>{x}</li>)}
          </ol>
        </div>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h3 className="text-lg font-bold">Bank transfer — verified by Finance</h3>
          <ol className="mt-4 space-y-2 text-[13px]">
            {['App shows PAC account name, bank, number, exact amount and unique reference', 'Customer transfers and uploads the receipt → “Evidence submitted”', 'Payment enters the Finance verification queue', 'Finance Officer checks the bank statement; verifies or rejects with reason', 'Only then does it count as verified revenue'].map((x, i) => <li key={i} className="flex gap-3"><span className="font-bold text-brand-accent-deep">{i + 1}.</span>{x}</li>)}
          </ol>
        </div>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <Callout tone="gold" title="Accounts PAC Petrol will need to open">
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>Payment provider merchant account (CAC documents, settlement account)</li>
            <li>Google Cloud (Maps Platform) billing account</li>
            <li>Firebase project for push notifications</li>
            <li>SMS provider with registered sender ID</li>
            <li>Apple Developer Program and Google Play Console (to publish the two mobile apps)</li>
            <li>Cloud hosting account and the PAC domain’s DNS</li>
          </ul>
        </Callout>
        <Callout tone="info" title="Costs">
          Most integrations are usage-based (per transaction, per SMS, per map request). Exact recurring costs depend on order volume and will be quoted and approved before
          implementation, as required by the Functional Requirements Specification (Part 14). All keys and accounts are registered in PAC Petrol’s name and handed over.
          <div className="mt-2 flex items-center gap-1.5 text-xs"><Store size={13} /> Store listings, app icons and splash screens use the official PAC monogram.</div>
        </Callout>
      </section>
    </div>
  );
}
