import { useEffect, type ReactNode } from 'react';
import clsx from 'clsx';
import { CheckCircle2, X, XCircle, AlertTriangle, Info, Circle, Loader } from 'lucide-react';
import type { Tone } from '../lib/format';
import { useStore } from '../lib/store';

// ---------- Brand ----------
/** Gold PAC monogram. The source JPG has a black background; `mix-blend-mode: lighten` drops it on dark brand surfaces. */
export function Monogram({ className = 'h-9' }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-center justify-center overflow-hidden rounded-lg bg-brand-primary', className)} style={{ aspectRatio: '1.5' }}>
      <img src="/brand/pac-monogram.jpg" alt="PAC" className="h-full w-full scale-[1.06] object-contain" style={{ mixBlendMode: 'lighten' }} />
    </span>
  );
}

export function Wordmark({ dark = false, sub }: { dark?: boolean; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Monogram className="h-9" />
      <div className="leading-none">
        <div className={clsx('text-[15px] font-extrabold tracking-[0.12em]', dark ? 'text-white' : 'text-brand-primary')}>PAC PETROL</div>
        {sub && <div className={clsx('mt-1 text-[10px] font-medium uppercase tracking-[0.18em]', dark ? 'text-brand-accent' : 'text-brand-accent-deep')}>{sub}</div>}
      </div>
    </div>
  );
}

// ---------- Badges ----------
const toneCls: Record<Tone, string> = {
  success: 'bg-status-success/10 text-status-success ring-status-success/25',
  warning: 'bg-status-warning/10 text-status-warning ring-status-warning/25',
  error: 'bg-status-error/10 text-status-error ring-status-error/25',
  info: 'bg-status-info/10 text-status-info ring-status-info/25',
  neutral: 'bg-ink-soft/10 text-ink-soft ring-ink-soft/25',
  brand: 'bg-brand-secondary/10 text-brand-secondary ring-brand-secondary/25',
};
const toneIcon: Record<Tone, typeof Circle> = {
  success: CheckCircle2, warning: Loader, error: XCircle, info: Info, neutral: Circle, brand: CheckCircle2,
};

/** Status badge — always icon + text, never colour alone (brand spec §6). */
export function Badge({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  const Icon = toneIcon[tone];
  return (
    <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', toneCls[tone], className)}>
      <Icon size={11} strokeWidth={2.5} />
      {children}
    </span>
  );
}
export function StatusBadge({ meta }: { meta: { label: string; tone: Tone } }) {
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

// ---------- Layout primitives ----------
export function Card({ children, className, title, action, pad = true }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; pad?: boolean }) {
  return (
    <section className={clsx('rounded-xl border border-line bg-white shadow-card', className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {action}
        </header>
      )}
      <div className={clsx(pad && 'p-4')}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone, onClick, icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'gold' | 'alert'; onClick?: () => void; icon?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={clsx(
        'group relative rounded-xl border bg-white p-4 text-left shadow-card transition',
        onClick && 'hover:-translate-y-0.5 hover:border-brand-secondary/40',
        tone === 'alert' ? 'border-status-error/30' : 'border-line',
      )}
    >
      {tone === 'gold' && <span className="absolute inset-x-4 top-0 h-0.5 rounded-b bg-brand-accent" />}
      <div className="flex items-start justify-between gap-2">
        <div className="text-[12px] font-medium text-ink-soft">{label}</div>
        {icon && <div className="text-brand-secondary/70">{icon}</div>}
      </div>
      <div className={clsx('mt-1.5 text-2xl font-bold tracking-tight', tone === 'alert' ? 'text-status-error' : 'text-ink')}>{value}</div>
      {hint && <div className="mt-1 text-[11px] text-ink-soft">{hint}</div>}
    </button>
  );
}

// ---------- Controls ----------
type BtnVariant = 'primary' | 'secondary' | 'gold' | 'ghost' | 'danger' | 'outline';
const btnCls: Record<BtnVariant, string> = {
  primary: 'bg-brand-primary text-white hover:bg-brand-secondary',
  secondary: 'bg-brand-secondary text-white hover:bg-brand-primary',
  gold: 'bg-brand-accent text-brand-primary hover:bg-[#cdb576]',
  ghost: 'text-ink hover:bg-surface-secondary',
  outline: 'border border-line bg-white text-ink hover:border-brand-secondary/50',
  danger: 'bg-status-error text-white hover:bg-[#a83333]',
};
export function Button({ variant = 'primary', size = 'md', className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...rest}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-45',
        size === 'sm' && 'px-2.5 py-1.5 text-xs',
        size === 'md' && 'px-3.5 py-2 text-sm',
        size === 'lg' && 'px-5 py-3 text-[15px]',
        btnCls[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-soft">{hint}</span>}
    </label>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-primary/40 p-4 pt-[6vh] backdrop-blur-[2px]" onMouseDown={onClose}>
      <div className={clsx('slide-up w-full rounded-2xl bg-white shadow-2xl', wide ? 'max-w-4xl' : 'max-w-lg')} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-soft hover:bg-surface-secondary" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto p-5 scroll-thin">{children}</div>
      </div>
    </div>
  );
}

export function Callout({ tone = 'info', title, children }: { tone?: 'info' | 'warning' | 'gold' | 'error'; title?: string; children: ReactNode }) {
  const cls = {
    info: 'border-status-info/25 bg-status-info/5',
    warning: 'border-status-warning/30 bg-status-warning/5',
    error: 'border-status-error/30 bg-status-error/5',
    gold: 'border-brand-accent/60 bg-[#fbf7ec]',
  }[tone];
  const Icon = tone === 'warning' || tone === 'error' ? AlertTriangle : Info;
  return (
    <div className={clsx('flex gap-3 rounded-xl border p-3.5 text-[13px]', cls)}>
      <Icon size={16} className="mt-0.5 shrink-0 text-brand-secondary" />
      <div>
        {title && <div className="mb-0.5 font-semibold text-ink">{title}</div>}
        <div className="text-ink/80">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line bg-surface-secondary/50 px-4 py-8 text-center text-sm text-ink-soft">{children}</div>;
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[] }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg bg-surface-secondary p-1">
      {items.map((it) => (
        <button key={it.value} onClick={() => onChange(it.value)} className={clsx('rounded-md px-3 py-1.5 text-xs font-medium transition', value === it.value ? 'bg-white text-brand-primary shadow-card' : 'text-ink-soft hover:text-ink')}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

/** Global toast surfaced by store errors/successes. */
export function Toaster() {
  const toast = useStore((s) => s.toast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => useStore.setState({ toast: undefined }), toast.kind === 'err' ? 6500 : 3000);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4">
      <div className={clsx('slide-up pointer-events-auto flex max-w-xl items-start gap-2.5 rounded-xl px-4 py-3 text-sm shadow-2xl', toast.kind === 'err' ? 'bg-[#3a1414] text-white' : 'bg-brand-primary text-white')}>
        {toast.kind === 'err' ? <XCircle size={18} className="mt-0.5 shrink-0 text-[#ff9c9c]" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-accent" />}
        <span>{toast.text}</span>
      </div>
    </div>
  );
}

export const ok = (text: string) => useStore.getState().showToast('ok', text);

export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/70 py-1.5 text-[13px] last:border-0">
      <span className="text-ink-soft">{k}</span>
      <span className="text-right font-medium text-ink">{v}</span>
    </div>
  );
}

export function ProgressBar({ value, max, tone = 'brand' }: { value: number; max: number; tone?: 'brand' | 'gold' | 'error' }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
      <div className={clsx('h-full rounded-full transition-all', tone === 'brand' && 'bg-brand-secondary', tone === 'gold' && 'bg-brand-accent', tone === 'error' && 'bg-status-error')} style={{ width: `${pct}%` }} />
    </div>
  );
}
