import type { OrderStatus, PaymentStatus, Role, StopStatus, TripStatus } from './types';

export const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');
export const litres = (n: number) => `${Math.round(n).toLocaleString('en-NG')} L`;

export const time = (t: number) =>
  new Date(t).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
export const dateTime = (t: number) =>
  new Date(t).toLocaleString('en-NG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
export const date = (t: number) => new Date(t).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });

export function ago(t: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand';

export const orderStatusMeta: Record<OrderStatus, { label: string; tone: Tone }> = {
  received: { label: 'Order Received', tone: 'info' },
  awaiting_payment: { label: 'Awaiting Payment', tone: 'warning' },
  payment_verification: { label: 'Payment Verification', tone: 'warning' },
  awaiting_confirmation: { label: 'Awaiting Confirmation', tone: 'warning' },
  confirmed: { label: 'Order Confirmed', tone: 'brand' },
  assigned: { label: 'Assigned for Dispatch', tone: 'brand' },
  out_for_delivery: { label: 'Out for Delivery', tone: 'info' },
  delivered: { label: 'Delivered', tone: 'success' },
  partially_delivered: { label: 'Partially Delivered', tone: 'warning' },
  delivery_failed: { label: 'Delivery Failed', tone: 'error' },
  completed: { label: 'Order Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export const paymentStatusMeta: Record<PaymentStatus, { label: string; tone: Tone }> = {
  not_initiated: { label: 'Not Initiated', tone: 'neutral' },
  pending: { label: 'Pending', tone: 'warning' },
  evidence_submitted: { label: 'Evidence Submitted', tone: 'warning' },
  verification_pending: { label: 'Verification Pending', tone: 'warning' },
  verified: { label: 'Verified', tone: 'success' },
  failed: { label: 'Failed', tone: 'error' },
  rejected: { label: 'Rejected', tone: 'error' },
  refund_pending: { label: 'Refund Pending', tone: 'warning' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};

export const tripStatusMeta: Record<TripStatus, { label: string; tone: Tone }> = {
  assigned: { label: 'Waiting for driver', tone: 'warning' },
  acknowledged: { label: 'Accepted — not started', tone: 'brand' },
  in_transit: { label: 'On the road', tone: 'info' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export const stopStatusMeta: Record<StopStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pending', tone: 'neutral' },
  delivered: { label: 'Completed', tone: 'success' },
  partial: { label: 'Partial', tone: 'warning' },
  failed: { label: 'Failed', tone: 'error' },
};

export const roleLabel: Record<Role, string> = {
  super_admin: 'Super Admin',
  operations: 'Operations Manager',
  finance: 'Finance Officer',
  inventory: 'Inventory Manager',
  support: 'Customer Support Officer',
};
