import { useEffect, useState } from 'react';
import type { DB } from './seed';
import type { Trip } from './types';
import { availableStock, depotStock, reservedStock, truckStock, useStore } from './store';

export const ACTIVE_TRIP = (t: Trip) => !['completed', 'cancelled'].includes(t.status);

export function inventoryFigures(db: DB) {
  return {
    depot: depotStock(db),
    onTrucks: truckStock(db),
    reserved: reservedStock(db),
    available: availableStock(db),
    delivered: db.trips.reduce((a, t) => a + t.stops.reduce((b, s) => b + (s.deliveredQty ?? 0), 0), 0),
  };
}

/** Verified revenue: ONLY finance-/gateway-verified payments, net of completed refunds (spec §3.2 financial control). */
export function verifiedRevenue(db: DB) {
  return db.payments.reduce((a, p) => {
    const counted = ['verified', 'refund_pending', 'refunded'].includes(p.status) ? p.amountDue : 0;
    const refunded = p.refund?.status === 'completed' ? p.refund.amount : 0;
    return a + counted - refunded;
  }, 0);
}

export function outstandingPayments(db: DB) {
  return db.payments
    .filter((p) => ['pending', 'evidence_submitted', 'verification_pending', 'failed', 'rejected'].includes(p.status))
    .filter((p) => db.orders.find((o) => o.id === p.orderId)?.status !== 'cancelled')
    .reduce((a, p) => a + p.amountDue, 0);
}

export function kpis(db: DB) {
  const o = db.orders;
  const stops = db.trips.flatMap((t) => t.stops);
  return {
    total: o.length,
    pending: o.filter((x) => ['received', 'awaiting_payment', 'payment_verification', 'awaiting_confirmation'].includes(x.status)).length,
    awaitingConfirmation: o.filter((x) => x.status === 'awaiting_confirmation').length,
    confirmed: o.filter((x) => x.status === 'confirmed').length,
    activeTrips: db.trips.filter(ACTIVE_TRIP).length,
    inTransit: db.trips.filter((t) => t.status === 'in_transit').length,
    needsAction: o.filter((x) => ['awaiting_confirmation', 'payment_verification', 'confirmed'].includes(x.status)).length,
    completedStops: stops.filter((s) => s.status === 'delivered').length,
    failedStops: stops.filter((s) => s.status === 'failed').length,
    partialStops: stops.filter((s) => s.status === 'partial').length,
    paymentsAwaiting: db.payments.filter((p) => p.status === 'verification_pending' || p.status === 'evidence_submitted').length,
    unresolvedExceptions: o.filter((x) => x.status === 'partially_delivered' || x.status === 'delivery_failed').length,
    openComplaints: db.complaints.filter((c) => !['resolved', 'closed'].includes(c.status)).length,
    revenue: verifiedRevenue(db),
    outstanding: outstandingPayments(db),
  };
}

/** GPS display state — never presents an old position as live (spec §3.4 / §6.5). */
export function gpsView(t: Trip, staleAfterSec: number, now: number) {
  if (t.gps.state === 'none') return { label: 'No location data', tone: 'neutral' as const, live: false };
  if (t.gps.state === 'permission_denied') return { label: 'Location unavailable (permission off)', tone: 'error' as const, live: false };
  if (t.gps.state === 'offline') return { label: 'Device offline — last known position', tone: 'error' as const, live: false };
  if (now - t.gps.updatedAt > staleAfterSec * 1000) return { label: 'Stale — last known position', tone: 'warning' as const, live: false };
  return { label: 'Live', tone: 'success' as const, live: true };
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(i);
  }, [intervalMs]);
  return now;
}

export const useDb = () => useStore((s) => s.db);

export function useCurrentStaff() {
  return useStore((s) => s.db.staff.find((u) => u.id === s.session.staffId)!);
}

/** One open tab drives the GPS simulation (leader election via localStorage) so multiple tabs don't double-move vehicles. */
export function useGpsSimulation() {
  useEffect(() => {
    const me = Math.random().toString(36).slice(2);
    const KEY = 'pac-gps-leader';
    const i = setInterval(() => {
      let leader: { id: string; ts: number } | null = null;
      try { leader = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* ignore */ }
      const now = Date.now();
      if (!leader || leader.id === me || now - leader.ts > 5000) {
        try { localStorage.setItem(KEY, JSON.stringify({ id: me, ts: now })); } catch { /* ignore */ }
        useStore.getState().gpsTick();
      }
    }, 1500);
    return () => clearInterval(i);
  }, []);
}
