import { Badge, Button, Callout, Monogram } from '../../components/ui';

const palette = [
  ['Midnight Evergreen', '#0B2924', 'brand.primary', 'Sidebar, headers, primary buttons', '20–25%'],
  ['Emerald', '#174B3D', 'brand.secondary', 'Secondary actions, selected states, progress', '8–12%'],
  ['Muted Champagne Gold', '#D7C18A', 'brand.accent', 'Premium accents, key figures, monogram — sparingly', '3–5%'],
  ['Warm Ivory', '#F5F3EC', 'surface.secondary', 'Page backgrounds, panels, forms', '55–65% (with white)'],
  ['White', '#FFFFFF', 'surface.primary', 'Cards, tables', ''],
  ['Graphite', '#252A27', 'text.primary', 'Body text, headings, icons', ''],
  ['Neutral Grey', '#77827B', 'text.secondary', 'Secondary text, inactive', ''],
];
const status = [
  ['success', 'Successful / Completed', '#237A50'],
  ['warning', 'Pending / Awaiting action', '#B7791F'],
  ['error', 'Failed / Rejected', '#C43D3D'],
  ['info', 'Information', '#3478B8'],
  ['neutral', 'Neutral / Inactive', '#77827B'],
] as const;

export default function DesignSystem() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8 max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent-deep">Brand & UI · Executive Evergreen</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">One visual identity across three apps</h1>
        <p className="mt-3 text-ink-soft">Premium, professional, trustworthy. Implemented as shared design tokens so a colour change in the central theme updates every screen of every app — no per-screen hard-coding.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h2 className="font-bold">Official palette & tokens</h2>
          <div className="mt-4 space-y-2">
            {palette.map(([n, hex, tok, use, share]) => (
              <div key={n} className="flex items-center gap-4 rounded-xl border border-line p-2.5">
                <span className="h-12 w-16 shrink-0 rounded-lg ring-1 ring-black/5" style={{ background: hex }} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2"><span className="font-semibold">{n}</span><code className="text-xs text-ink-soft">{hex}</code><code className="rounded bg-surface-secondary px-1.5 text-[11px] text-brand-secondary">{tok}</code></div>
                  <div className="text-[12px] text-ink-soft">{use}</div>
                </div>
                {share && <span className="hidden text-xs font-medium text-ink-soft sm:block">{share}</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl bg-brand-primary p-6 text-white">
            <h2 className="font-bold text-brand-accent">Logo</h2>
            <div className="mt-4 flex items-center gap-4">
              <Monogram className="h-20" />
              <div className="text-sm text-white/75">PAC monogram in champagne gold on Midnight Evergreen. Used for app icons, splash screens and the dashboard sidebar. Never stretched or recoloured.</div>
            </div>
            <img src="/brand/pac-lockup.jpg" alt="PAC Petrol lockup" className="mt-4 rounded-xl ring-1 ring-white/10" />
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="font-bold">Functional status colours</h2>
            <p className="mt-1 text-[13px] text-ink-soft">Brand colours never replace status colours, and colour is never the only signal — every status carries an icon and text label.</p>
            <div className="mt-4 space-y-2">
              {status.map(([tone, label, hex]) => (
                <div key={tone} className="flex items-center justify-between gap-3"><Badge tone={tone}>{label}</Badge><code className="text-xs text-ink-soft">{hex}</code></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h2 className="font-bold">Typography — Inter</h2>
          <div className="mt-4 space-y-3">
            <div><div className="text-[28px] font-bold leading-tight">Page heading · Bold 24–28</div></div>
            <div><div className="text-[19px] font-semibold">Section heading · Semibold 17–20</div></div>
            <div><div className="text-[14px] font-semibold">Card heading · Semibold 13–15</div></div>
            <div><div className="text-[14px]">Body text · Regular 13–15. Clear, readable, generous line-height.</div></div>
            <div><div className="text-[13px] text-ink-soft">Table text · 12–14 · Supporting labels 11–12</div></div>
            <div className="text-3xl font-bold tracking-tight">₦4,505,000 <span className="text-sm font-medium text-ink-soft">metrics · Semibold/Bold</span></div>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h2 className="font-bold">Components</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button>Primary action</Button><Button variant="secondary">Secondary</Button><Button variant="gold">Important CTA</Button><Button variant="outline">Outline</Button><Button variant="danger">Destructive</Button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line p-4"><div className="text-xs text-ink-soft">KPI card</div><div className="text-2xl font-bold">13,000 L</div><div className="text-[11px] text-ink-soft">Available stock</div></div>
            <div className="relative rounded-xl border border-line p-4"><span className="absolute inset-x-4 top-0 h-0.5 bg-brand-accent" /><div className="text-xs text-ink-soft">Highlighted KPI</div><div className="text-2xl font-bold">₦8.3m</div><div className="text-[11px] text-ink-soft">Verified revenue</div></div>
          </div>
          <ul className="mt-5 space-y-1 text-[13px] text-ink/85">
            <li>• Light mode default on all platforms</li><li>• Visible focus states (gold ring) for keyboard users</li><li>• No heavy gradients, neon, cartoon illustrations or mixed icon styles</li><li>• Large touch targets in the Driver App for use in the field</li>
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <Callout tone="warning" title="Palette discrepancy to resolve">
          The Admin Dashboard specification lists an earlier palette (Deep Forest Green #123D32, Dark Emerald #1B5947, Champagne Gold #E8C56B, Soft Sage #F3F6F3, Charcoal #202923),
          while the Official Brand Colour & UI Specification defines Executive Evergreen (#0B2924, #174B3D, #D7C18A, #F5F3EC, #252A27). This demo follows the <b>official brand specification</b>.
          PAC Petrol should confirm which is final; because colours are tokens, switching is a one-file change.
        </Callout>
      </div>
    </div>
  );
}
