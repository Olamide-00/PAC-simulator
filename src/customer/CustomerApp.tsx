import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Home, Fuel, ListOrdered, Bell, User } from 'lucide-react';
import { useStore } from '../lib/store';
import { HomeScreen, OrderScreen, PayScreen, TrackScreen, OrdersScreen, NotificationsScreen, ProfileScreen } from './screens';

export type CScreen =
  | { name: 'home' } | { name: 'order' } | { name: 'pay'; orderId: string } | { name: 'track'; orderId: string }
  | { name: 'orders' } | { name: 'notifications' } | { name: 'profile'; tab?: 'support' | 'payments' | 'addresses' };

export type Nav = (s: CScreen) => void;

/** Customer mobile app — Android/iOS in production (React Native). Rendered here inside a device frame. */
export default function CustomerApp() {
  const [splash, setSplash] = useState(true);
  const [screen, setScreen] = useState<CScreen>({ name: 'home' });
  const customerId = useStore((s) => s.session.customerId);
  const unread = useStore((s) => s.db.notifications.filter((n) => n.audience === 'customer' && n.recipientId === customerId && !n.read).length);

  useEffect(() => { const t = setTimeout(() => setSplash(false), 1400); return () => clearTimeout(t); }, []);

  if (splash) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-brand-primary px-8 text-center">
        <img src="/brand/pac-monogram.jpg" alt="PAC" className="w-56" style={{ mixBlendMode: 'lighten' }} />
        <div className="mt-2 text-lg font-extrabold tracking-[0.2em] text-white">PAC PETROL</div>
        <div className="mt-1 text-[13px] italic text-brand-accent">Fuel delivered to your doorstep.</div>
        <div className="mt-8 h-1 w-24 overflow-hidden rounded-full bg-white/10"><div className="h-full w-1/2 animate-[pulse_1s_ease-in-out_infinite] rounded-full bg-brand-accent" /></div>
      </div>
    );
  }

  const tabs = [
    { k: 'home', label: 'Home', icon: Home },
    { k: 'order', label: 'Order', icon: Fuel },
    { k: 'orders', label: 'Orders', icon: ListOrdered },
    { k: 'notifications', label: 'Alerts', icon: Bell, badge: unread },
    { k: 'profile', label: 'Profile', icon: User },
  ] as const;
  const activeTab = screen.name === 'pay' || screen.name === 'track' ? 'orders' : screen.name;

  return (
    <>
      <div className="flex-1 overflow-y-auto scroll-thin" key={JSON.stringify(screen)}>
        {screen.name === 'home' && <HomeScreen nav={setScreen} />}
        {screen.name === 'order' && <OrderScreen nav={setScreen} />}
        {screen.name === 'pay' && <PayScreen nav={setScreen} orderId={screen.orderId} />}
        {screen.name === 'track' && <TrackScreen nav={setScreen} orderId={screen.orderId} />}
        {screen.name === 'orders' && <OrdersScreen nav={setScreen} />}
        {screen.name === 'notifications' && <NotificationsScreen nav={setScreen} />}
        {screen.name === 'profile' && <ProfileScreen nav={setScreen} initialTab={screen.tab} />}
      </div>
      <nav className="grid grid-cols-5 border-t border-line bg-white px-1 pb-4 pt-1.5">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setScreen({ name: t.k } as CScreen)} className={clsx('relative flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium', activeTab === t.k ? 'text-brand-primary' : 'text-ink-soft')}>
            <t.icon size={20} strokeWidth={activeTab === t.k ? 2.4 : 1.8} />
            {t.label}
            {'badge' in t && t.badge > 0 && <span className="absolute right-3 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-error px-1 text-[9px] font-bold text-white">{t.badge}</span>}
            {activeTab === t.k && <span className="absolute -top-1.5 h-0.5 w-6 rounded-full bg-brand-accent" />}
          </button>
        ))}
      </nav>
    </>
  );
}
