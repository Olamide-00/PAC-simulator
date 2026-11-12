import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Signal, Wifi, BatteryFull } from 'lucide-react';
import { Wordmark } from './ui';
import { time } from '../lib/format';
import { useNow } from '../lib/selectors';

/** Device frame used to present the Customer and Driver mobile apps (React Native / Flutter in production). */
export function PhoneFrame({ children, label }: { children: ReactNode; label?: string }) {
  const now = useNow(30_000);
  return (
    <div className="flex flex-col items-center">
      {label && <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">{label}</div>}
      <div className="relative w-[360px] max-w-full rounded-[44px] bg-[#111614] p-[10px] shadow-[0_30px_60px_-20px_rgba(11,41,36,.45)]">
        <div className="relative h-[740px] max-h-[calc(100vh-120px)] min-h-[600px] overflow-hidden rounded-[36px] bg-surface-secondary">
          <div className="absolute left-1/2 top-2 z-30 h-6 w-28 -translate-x-1/2 rounded-full bg-[#111614]" />
          <div className="relative z-20 flex h-10 items-center justify-between px-7 pt-1 text-[12px] font-semibold text-ink">
            <span>{time(now)}</span>
            <span className="flex items-center gap-1"><Signal size={13} /><Wifi size={13} /><BatteryFull size={15} /></span>
          </div>
          <div className="absolute inset-x-0 bottom-0 top-10 flex flex-col">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function PhoneStage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-full bg-[radial-gradient(ellipse_at_top,#ffffff_0%,#F5F3EC_60%)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/demo" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-secondary hover:underline"><ArrowLeft size={16} /> Demo console</Link>
        <Wordmark sub={title} />
        <Link to="/admin" className="text-sm font-medium text-brand-secondary hover:underline">Admin Dashboard →</Link>
      </header>
      <div className="flex justify-center px-4 pb-10"><PhoneFrame>{children}</PhoneFrame></div>
    </div>
  );
}
