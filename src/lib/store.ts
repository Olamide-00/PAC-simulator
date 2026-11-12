// ============================================================================
// SIMULATED CENTRAL BACKEND
// In production this logic lives server-side (see /architecture). Here it runs in
// the browser so the client can see all three apps share ONE source of truth.
// Every action validates business rules, writes an audit entry, emits a system
// event and fans out notifications — exactly what the real API would do.
// ============================================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AREAS, createSeed, DEPOT, type DB } from './seed';
import { can, type Permission } from './permissions';
import { litres, naira, orderStatusMeta, roleLabel } from './format';
import type {
  Address, AppNotification, Audience, Complaint, Driver, GpsState, Order, OrderStatus, PaymentMethod, Result, Settings, SystemEvent, Trip, Vehicle,
} from './types';

interface Session { staffId: string; customerId: string; driverId: string }
type R = Result & { commit?: boolean };

interface Store {
  db: DB;
  session: Session;
  toast?: { kind: 'ok' | 'err'; text: string; at: number };
  // session
  setStaff: (id: string) => void;
  setDriverSession: (id: string) => void;
  resetDemo: () => void;
  showToast: (kind: 'ok' | 'err', text: string) => void;
  // customer app
  placeOrder: (p: { qty: number; addressId: string; method: PaymentMethod; requestId: string }) => Result;
  payWithCard: (orderId: string, succeed: boolean) => Result;
  submitTransferEvidence: (orderId: string, amount: number, bankRef: string) => Result;
  customerCancel: (orderId: string) => Result;
  addAddress: (a: Omit<Address, 'id' | 'pos'>) => Result;
  submitComplaint: (p: { orderId?: string; category: string; message: string }) => Result;
  markRead: (audience: Audience, recipientId?: string) => void;
  // admin
  verifyPayment: (paymentId: string) => Result;
  rejectPayment: (paymentId: string, reason: string) => Result;
  processRefund: (paymentId: string) => Result;
  confirmOrder: (orderId: string) => Result;
  adminCancelOrder: (orderId: string, reason: string) => Result;
  resolveException: (orderId: string, resolution: 'refund' | 'reschedule') => Result;
  assignOrderToDriver: (orderId: string, driverId: string) => Result;
  removeOrderFromTrip: (orderId: string, reason: string) => Result;
  addDriver: (p: { name: string; phone: string; licenceNo: string; licenceExpiry: string; vehicleId?: string }) => Result;
  deleteDriver: (driverId: string, reason: string) => Result;
  deleteVehicle: (vehicleId: string, reason: string) => Result;
  assignDriverToVehicle: (driverId: string | null, vehicleId: string | null) => Result;
  recordReceipt: (qty: number, supplier: string, ref: string) => Result;
  loadTruck: (vehicleId: string, qty: number) => Result;
  unloadTruck: (vehicleId: string, qty: number) => Result;
  updatePrice: (field: 'unitPrice' | 'deliveryFee', value: number, reason: string) => Result;
  updateSettings: (patch: Partial<Settings>, label: string) => Result;
  setDriverStatus: (driverId: string, status: Driver['status'], reason: string) => Result;
  setVehicleStatus: (vehicleId: string, status: Vehicle['status'], reason: string) => Result;
  addVehicle: (reg: string, capacity: number) => Result;
  setCustomerStatus: (customerId: string, status: 'active' | 'suspended', reason: string) => Result;
  updateComplaint: (id: string, status: Complaint['status'], note: string, internal: boolean) => Result;
  setGpsState: (tripId: string, state: GpsState) => Result;
  // driver app
  acknowledgeTrip: (tripId: string) => Result;
  startTrip: (tripId: string) => Result;
  completeStop: (tripId: string, stopId: string, qty: number, otp: string, reason?: string) => Result;
  failStop: (tripId: string, stopId: string, reason: string) => Result;
  reportIncident: (tripId: string, category: string, text: string) => Result;
  // simulation
  gpsTick: () => void;
}

// ---------------------------------------------------------------------------
// helpers operating on a draft DB
// ---------------------------------------------------------------------------
const uid = (db: DB, p: string) => `${p}-${++db.counters.seq}`;
const staffOf = (db: DB, s: Session) => db.staff.find((u) => u.id === s.staffId)!;

function audit(db: DB, s: Session, action: string, record: string, before?: string, after?: string, reason?: string, denied = false) {
  const u = staffOf(db, s);
  db.audit.unshift({ id: uid(db, 'AU'), at: Date.now(), actor: u.name, role: roleLabel[u.role], action, record, before, after, reason, denied });
}
function auditAs(db: DB, actor: string, role: string, action: string, record: string, before?: string, after?: string, reason?: string) {
  db.audit.unshift({ id: uid(db, 'AU'), at: Date.now(), actor, role, action, record, before, after, reason });
}
function emit(db: DB, source: SystemEvent['source'], event: string, detail: string) {
  db.events.unshift({ id: uid(db, 'E'), at: Date.now(), source, event, detail });
  if (db.events.length > 200) db.events.length = 200;
}
function notify(db: DB, n: Omit<AppNotification, 'id' | 'at' | 'read'>) {
  db.notifications.unshift({ ...n, id: uid(db, 'N'), at: Date.now(), read: false });
}
function timeline(o: Order, label: string, by: string, note?: string) {
  o.timeline.push({ at: Date.now(), label, by, note });
}
function guard(db: DB, s: Session, p: Permission, what: string): R | null {
  const u = staffOf(db, s);
  if (can(u.role, p)) return null;
  audit(db, s, `DENIED: ${what}`, p, undefined, undefined, `Role ${roleLabel[u.role]} lacks permission "${p}"`, true);
  emit(db, 'Backend', 'auth.forbidden', `403 · ${u.name} (${roleLabel[u.role]}) → ${what}`);
  return { ok: false, commit: true, error: `403 Forbidden — ${roleLabel[u.role]} cannot ${what}. The backend rejected this request and logged the attempt.` };
}
const fail = (error: string): R => ({ ok: false, error });

// ---- inventory derivations (shared with selectors) ----
/** Fuel in the depot tank = sum of the movement ledger (receipts in, truck loads out, truck unloads back in). */
export function depotStock(db: DB) { return db.movements.reduce((a, m) => a + m.qty, 0); }
/** Fuel currently sitting in truck tanks. */
export function truckStock(db: DB) { return db.vehicles.filter((v) => !v.removed).reduce((a, v) => a + v.fuel, 0); }
/** Litres promised to confirmed orders that haven't been delivered yet. */
export function reservedStock(db: DB) {
  return db.orders.filter((o) => ['confirmed', 'assigned', 'out_for_delivery'].includes(o.status)).reduce((a, o) => a + o.qty, 0);
}
/** What can still be sold: depot + trucks − already promised. */
export function availableStock(db: DB) { return depotStock(db) + truckStock(db) - reservedStock(db); }
/** Litres on a truck already earmarked for undelivered stops on its current trip. */
export function truckCommitted(db: DB, vehicleId: string) {
  return db.trips.filter((t) => t.vehicleId === vehicleId && ['assigned', 'acknowledged', 'in_transit'].includes(t.status))
    .reduce((a, t) => a + t.stops.filter((st) => st.status === 'pending').reduce((b, st) => b + st.orderedQty, 0), 0);
}

function setOrderStatus(o: Order, status: OrderStatus, by: string, label?: string) {
  o.status = status;
  timeline(o, label ?? orderStatusMeta[status].label, by);
}

/** Pair a driver with a truck, releasing any previous pairing on either side. */
function pair(db: DB, driverId: string | null, vehicleId: string | null) {
  const d = driverId ? db.drivers.find((x) => x.id === driverId) : undefined;
  const v = vehicleId ? db.vehicles.find((x) => x.id === vehicleId) : undefined;
  if (d?.vehicleId) { const old = db.vehicles.find((x) => x.id === d.vehicleId); if (old) old.driverId = undefined; d.vehicleId = undefined; }
  if (v?.driverId) { const old = db.drivers.find((x) => x.id === v.driverId); if (old) old.vehicleId = undefined; v.driverId = undefined; }
  if (d && v) { d.vehicleId = v.id; v.driverId = d.id; }
}
const hasActiveTrip = (db: DB, p: (t: Trip) => boolean) => db.trips.some((t) => p(t) && !['completed', 'cancelled'].includes(t.status));
const nextId = (prefix: string, ids: string[]) => `${prefix}-${String(Math.max(0, ...ids.map((i) => parseInt(i.split('-')[1], 10) || 0)) + 1).padStart(2, '0')}`;

/** A trip finishes on its own once every stop has an outcome — no separate return/close step. */
function finishTripIfDone(db: DB, trip: Trip) {
  if (!trip.stops.every((st) => st.status !== 'pending')) return;
  trip.status = 'completed'; trip.completedAt = Date.now();
  const v = db.vehicles.find((x) => x.id === trip.vehicleId); if (v && v.status === 'on_trip') v.status = 'available';
  const d = db.drivers.find((x) => x.id === trip.driverId); if (d) d.duty = 'available';
  const delivered = trip.stops.reduce((a, st) => a + (st.deliveredQty ?? 0), 0);
  emit(db, 'Backend', 'trip.completed', `${trip.id} · ${litres(delivered)} delivered · ${litres(v?.fuel ?? 0)} left on ${v?.reg}`);
  notify(db, { audience: 'admin', type: 'Trip completed', message: `${trip.id}: all stops done. ${litres(v?.fuel ?? 0)} still on ${v?.reg}.`, severity: 'success', link: '/admin/tracking' });
}

// ---------------------------------------------------------------------------
export const useStore = create<Store>()(
  persist(
    (set, get) => {
      /** Run a mutation against a cloned DB. Commits on success (or when a denied attempt must be logged). */
      const act = (fn: (db: DB, s: Session) => R): Result => {
        const draft = structuredClone(get().db);
        const r = fn(draft, get().session);
        if (r.ok || r.commit) set({ db: draft });
        if (!r.ok && r.error) set({ toast: { kind: 'err', text: r.error, at: Date.now() } });
        return { ok: r.ok, error: r.error, id: r.id };
      };

      return {
        db: createSeed(),
        session: { staffId: 'S-01', customerId: 'C-1001', driverId: 'D-01' },

        setStaff: (id) => set((st) => ({ session: { ...st.session, staffId: id } })),
        setDriverSession: (id) => set((st) => ({ session: { ...st.session, driverId: id } })),
        resetDemo: () => set({ db: createSeed(), session: { staffId: 'S-01', customerId: 'C-1001', driverId: 'D-01' } }),
        showToast: (kind, text) => set({ toast: { kind, text, at: Date.now() } }),

        // ===================== CUSTOMER APP =====================
        placeOrder: ({ qty, addressId, method, requestId }) =>
          act((db, s) => {
            // Idempotency — a retried / double-tapped submission returns the original order (spec §8, FR-CUS-012)
            if (db.idempotency[requestId]) return { ok: true, id: db.idempotency[requestId] };
            const c = db.customers.find((x) => x.id === s.customerId)!;
            const st = db.settings;
            if (c.status !== 'active') return fail('Your account is suspended. Please contact support.');
            if (!st.acceptingOrders) return fail('PAC Petrol is not accepting orders right now.');
            if (!Number.isInteger(qty) || qty <= 0) return fail('Enter a whole number of litres greater than zero.');
            if (qty < st.minOrder || qty > st.maxOrder) return fail(`Quantity must be between ${litres(st.minOrder)} and ${litres(st.maxOrder)}.`);
            if (!st.paymentMethods[method]) return fail('That payment method is not currently enabled.');
            const a = c.addresses.find((x) => x.id === addressId);
            if (!a) return fail('Select a delivery address.');
            if (!st.serviceAreas.includes(a.area)) return fail(`Sorry — ${a.area} is outside PAC Petrol's current delivery area. We can't accept this order yet.`);
            if (availableStock(db) < qty) return fail('Not enough petrol is available for this quantity right now. Try a smaller quantity or check back later.');
            // Price is authoritative from the backend, never from the client
            const id = `PAC-${++db.counters.order}`;
            const payId = `PAY-${++db.counters.pay}`;
            const total = qty * st.unitPrice + st.deliveryFee;
            db.payments.unshift({ id: payId, orderId: id, customerId: c.id, amountDue: total, method, reference: method === 'card' ? `PSK_${db.counters.pay}` : `TRF/${id}`, status: 'pending', createdAt: Date.now() });
            const o: Order = {
              id, customerId: c.id, product: 'PMS', qty, unitPrice: st.unitPrice, deliveryFee: st.deliveryFee, total,
              address: structuredClone(a), paymentMethod: method, paymentId: payId, status: 'awaiting_payment', createdAt: Date.now(),
              deliveryOtp: String(1000 + Math.floor(Math.random() * 9000)),
              timeline: [{ at: Date.now(), label: 'Order placed', by: 'Customer' }, { at: Date.now(), label: 'Order received — awaiting payment', by: 'System' }],
            };
            db.orders.unshift(o);
            db.idempotency[requestId] = id;
            emit(db, 'Customer App', 'order.created', `${id} · ${litres(qty)} · ${a.area} · ${naira(total)}`);
            notify(db, { audience: 'admin', type: 'New order', message: `${id} — ${c.name}, ${litres(qty)}, ${a.area}`, severity: 'info', link: '/admin/orders' });
            notify(db, { audience: 'customer', recipientId: c.id, type: 'Order received', message: `${id} received. Complete payment so we can confirm your order.`, severity: 'info' });
            return { ok: true, id };
          }),

        payWithCard: (orderId, succeed) =>
          act((db) => {
            const o = db.orders.find((x) => x.id === orderId);
            const p = o && db.payments.find((x) => x.id === o.paymentId);
            if (!o || !p) return fail('Order not found.');
            if (p.status === 'verified') return fail('This order is already paid.');
            emit(db, 'Customer App', 'payment.initiated', `${orderId} · card · ${naira(p.amountDue)}`);
            if (!succeed) {
              p.status = 'failed';
              timeline(o, 'Card payment failed at gateway', 'Payment Gateway');
              emit(db, 'Payment Gateway', 'charge.failed', `${orderId} · declined`);
              notify(db, { audience: 'customer', recipientId: o.customerId, type: 'Payment failed', message: `Payment for ${orderId} failed. Your order is kept — you can retry.`, severity: 'warning' });
              return { ok: true };
            }
            // Server-side webhook verification (signature + amount check) — not the client — marks it verified
            p.status = 'verified'; p.amountSubmitted = p.amountDue; p.verifiedBy = 'Payment gateway webhook'; p.verifiedAt = Date.now();
            emit(db, 'Payment Gateway', 'charge.success → webhook', `${orderId} · signature valid · amount ${naira(p.amountDue)} matches`);
            setOrderStatus(o, 'awaiting_confirmation', 'Payment Gateway', 'Payment verified by gateway — awaiting operational confirmation');
            auditAs(db, 'Payment gateway', 'System', 'Payment verified', p.id, 'Pending', 'Verified');
            notify(db, { audience: 'customer', recipientId: o.customerId, type: 'Payment confirmed', message: `${naira(p.amountDue)} received for ${orderId}.`, severity: 'success' });
            notify(db, { audience: 'admin', type: 'Order awaiting confirmation', message: `${orderId} — paid by card, ready for operational checks`, severity: 'info', link: '/admin/orders' });
            return { ok: true };
          }),

        submitTransferEvidence: (orderId, amount, bankRef) =>
          act((db) => {
            const o = db.orders.find((x) => x.id === orderId);
            const p = o && db.payments.find((x) => x.id === o.paymentId);
            if (!o || !p) return fail('Order not found.');
            if (!['pending', 'rejected', 'failed'].includes(p.status)) return fail('Payment evidence already submitted.');
            p.status = 'verification_pending'; p.amountSubmitted = amount; p.evidence = `Transfer receipt — ${naira(amount)} — ref ${bankRef || 'n/a'}`;
            p.rejectReason = undefined;
            setOrderStatus(o, 'payment_verification', 'Customer', 'Transfer evidence submitted — awaiting finance verification');
            emit(db, 'Customer App', 'payment.evidence_submitted', `${orderId} · ${naira(amount)} · receipt uploaded`);
            notify(db, { audience: 'admin', type: 'Payment awaiting verification', message: `${orderId} — ${naira(amount)} transfer evidence submitted`, severity: 'warning', link: '/admin/payments' });
            return { ok: true };
          }),

        customerCancel: (orderId) =>
          act((db) => {
            const o = db.orders.find((x) => x.id === orderId);
            if (!o) return fail('Order not found.');
            if (!['received', 'awaiting_payment', 'payment_verification', 'awaiting_confirmation', 'confirmed'].includes(o.status))
              return fail('This order has already been assigned for dispatch. Please contact support to request cancellation.');
            const p = db.payments.find((x) => x.id === o.paymentId)!;
            setOrderStatus(o, 'cancelled', 'Customer', 'Cancelled by customer');
            if (p.status === 'verified') {
              p.status = 'refund_pending';
              p.refund = { amount: p.amountDue, reason: 'Customer cancelled before dispatch', status: 'pending', by: 'System', at: Date.now() };
              notify(db, { audience: 'admin', type: 'Refund requires review', message: `${orderId} cancelled after payment — refund ${naira(p.amountDue)}`, severity: 'warning', link: '/admin/payments' });
            }
            emit(db, 'Customer App', 'order.cancelled', `${orderId} · reservation released`);
            return { ok: true };
          }),

        addAddress: (a) =>
          act((db, s) => {
            const c = db.customers.find((x) => x.id === s.customerId)!;
            const id = uid(db, 'A');
            // Production: geocoded via Google Places/Geocoding. Demo: area centroid on the schematic map.
            c.addresses.push({ ...a, id, pos: { ...(AREAS[a.area] ?? { x: 60, y: 420 }) } });
            return { ok: true, id };
          }),

        submitComplaint: ({ orderId, category, message }) =>
          act((db, s) => {
            if (message.trim().length < 5) return fail('Please describe the problem.');
            const id = `CMP-${++db.counters.cmp}`;
            db.complaints.unshift({ id, customerId: s.customerId, orderId, category, message, priority: /quantity|payment/i.test(category) ? 'high' : 'medium', status: 'submitted', createdAt: Date.now(), notes: [] });
            emit(db, 'Customer App', 'complaint.created', `${id} · ${category}`);
            notify(db, { audience: 'admin', type: 'New complaint', message: `${id} — ${category}${orderId ? ` (${orderId})` : ''}`, severity: 'warning', link: '/admin/complaints' });
            return { ok: true, id };
          }),

        markRead: (audience, recipientId) =>
          set((st) => ({
            db: { ...st.db, notifications: st.db.notifications.map((n) => (n.audience === audience && (!recipientId || n.recipientId === recipientId) ? { ...n, read: true } : n)) },
          })),

        // ===================== ADMIN — PAYMENTS =====================
        verifyPayment: (paymentId) =>
          act((db, s) => {
            const g = guard(db, s, 'payments.verify', 'verify payments'); if (g) return g;
            const p = db.payments.find((x) => x.id === paymentId);
            if (!p) return fail('Payment not found.');
            if (p.status !== 'verification_pending' && p.status !== 'evidence_submitted') return fail('Only payments awaiting verification can be verified.');
            const u = staffOf(db, s);
            p.status = 'verified'; p.verifiedBy = u.name; p.verifiedAt = Date.now();
            const o = db.orders.find((x) => x.id === p.orderId)!;
            setOrderStatus(o, 'awaiting_confirmation', u.name, 'Payment verified against bank statement — awaiting operational confirmation');
            audit(db, s, 'Payment verified', `${p.id} (${o.id})`, 'Verification Pending', 'Verified');
            emit(db, 'Admin Dashboard', 'payment.verified', `${o.id} · ${naira(p.amountDue)} · by ${u.name}`);
            notify(db, { audience: 'customer', recipientId: o.customerId, type: 'Payment confirmed', message: `Your payment of ${naira(p.amountDue)} for ${o.id} has been verified.`, severity: 'success' });
            return { ok: true };
          }),

        rejectPayment: (paymentId, reason) =>
          act((db, s) => {
            const g = guard(db, s, 'payments.verify', 'reject payments'); if (g) return g;
            if (!reason.trim()) return fail('A rejection reason is required.');
            const p = db.payments.find((x) => x.id === paymentId);
            if (!p) return fail('Payment not found.');
            const u = staffOf(db, s);
            p.status = 'rejected'; p.rejectReason = reason;
            const o = db.orders.find((x) => x.id === p.orderId)!;
            setOrderStatus(o, 'awaiting_payment', u.name, `Payment evidence rejected — ${reason}`);
            audit(db, s, 'Payment rejected', `${p.id} (${o.id})`, 'Verification Pending', 'Rejected', reason);
            emit(db, 'Admin Dashboard', 'payment.rejected', `${o.id} · ${reason}`);
            notify(db, { audience: 'customer', recipientId: o.customerId, type: 'Payment not verified', message: `We could not verify payment for ${o.id}: ${reason}`, severity: 'warning' });
            return { ok: true };
          }),

        processRefund: (paymentId) =>
          act((db, s) => {
            const g = guard(db, s, 'payments.refund', 'process refunds'); if (g) return g;
            const p = db.payments.find((x) => x.id === paymentId);
            if (!p?.refund || p.refund.status !== 'pending') return fail('No pending refund on this payment.');
            p.refund.status = 'completed'; p.refund.by = staffOf(db, s).name; p.refund.at = Date.now();
            if (p.status === 'refund_pending') p.status = 'refunded';
            audit(db, s, 'Refund processed', p.id, 'Refund pending', `Refunded ${naira(p.refund.amount)}`, p.refund.reason);
            emit(db, 'Admin Dashboard', 'refund.completed', `${p.orderId} · ${naira(p.refund.amount)}`);
            notify(db, { audience: 'customer', recipientId: p.customerId, type: 'Refund completed', message: `${naira(p.refund.amount)} refunded for ${p.orderId}.`, severity: 'success' });
            return { ok: true };
          }),

        // ===================== ADMIN — ORDERS =====================
        confirmOrder: (orderId) =>
          act((db, s) => {
            const g = guard(db, s, 'orders.confirm', 'confirm orders'); if (g) return g;
            const o = db.orders.find((x) => x.id === orderId);
            if (!o) return fail('Order not found.');
            const p = db.payments.find((x) => x.id === o.paymentId)!;
            const st = db.settings;
            // Spec §4.6 — never auto-confirm; every check must pass
            if (o.status === 'awaiting_payment' && st.requirePaymentBeforeConfirmation) return fail('The customer hasn’t paid yet — the order can be confirmed once payment arrives.');
            if (!['awaiting_confirmation', 'payment_verification', 'awaiting_payment'].includes(o.status))
              return fail(`Order is "${orderStatusMeta[o.status].label}" — it cannot be confirmed from this state.`);
            // Transfer receipt waiting? Confirming the order also accepts the payment — but only for someone allowed to verify money.
            if (p.status === 'verification_pending' || p.status === 'evidence_submitted') {
              const gp = guard(db, s, 'payments.verify', 'accept transfer payments'); if (gp) return gp;
              const u0 = staffOf(db, s);
              p.status = 'verified'; p.verifiedBy = u0.name; p.verifiedAt = Date.now();
              timeline(o, 'Transfer payment checked and accepted', u0.name);
              audit(db, s, 'Payment verified', `${p.id} (${o.id})`, 'Verification Pending', 'Verified', 'Accepted while confirming the order');
              emit(db, 'Admin Dashboard', 'payment.verified', `${o.id} · ${naira(p.amountDue)} · by ${u0.name}`);
              notify(db, { audience: 'customer', recipientId: o.customerId, type: 'Payment confirmed', message: `Your payment of ${naira(p.amountDue)} for ${o.id} has been verified.`, severity: 'success' });
            }
            if (st.requirePaymentBeforeConfirmation && p.status !== 'verified') return fail('Payment has not been received yet. Confirmation blocked.');
            if (!st.serviceAreas.includes(o.address.area)) return fail(`${o.address.area} is no longer in the approved service area.`);
            const avail = availableStock(db);
            if (avail < o.qty) return fail(`Insufficient unreserved stock: ${litres(avail)} available, ${litres(o.qty)} required.`);
            const u = staffOf(db, s);
            setOrderStatus(o, 'confirmed', u.name, `Order confirmed — ${litres(o.qty)} reserved`);
            audit(db, s, 'Order confirmed', o.id, 'Awaiting Confirmation', 'Confirmed', `Checks passed · ${litres(o.qty)} reserved`);
            notify(db, { audience: 'admin', type: 'Order needs a driver', message: `${o.id} is confirmed — assign a driver`, severity: 'info', link: `/admin/orders?open=${o.id}` });
            emit(db, 'Admin Dashboard', 'order.confirmed', `${o.id} · stock reserved ${litres(o.qty)}`);
            notify(db, { audience: 'customer', recipientId: o.customerId, type: 'Order confirmed', message: `${o.id} is confirmed and is being prepared for dispatch.`, severity: 'success' });
            if (availableStock(db) < st.lowStockThreshold)
              notify(db, { audience: 'admin', type: 'Low stock warning', message: `Unreserved stock below ${litres(st.lowStockThreshold)} threshold`, severity: 'critical', link: '/admin/inventory' });
            return { ok: true };
          }),

        adminCancelOrder: (orderId, reason) =>
          act((db, s) => {
            const g = guard(db, s, 'orders.cancel', 'cancel orders'); if (g) return g;
            if (!reason.trim()) return fail('A cancellation reason is required.');
            const o = db.orders.find((x) => x.id === orderId);
            if (!o) return fail('Order not found.');
            if (['out_for_delivery', 'delivered', 'partially_delivered', 'delivery_failed', 'completed', 'cancelled'].includes(o.status))
              return fail('Orders already out for delivery or finalised cannot be cancelled here — use the exception process.');
            if (o.status === 'assigned') return fail('Unassign the driver first, then cancel the order.');
            const prev = orderStatusMeta[o.status].label;
            setOrderStatus(o, 'cancelled', staffOf(db, s).name, `Cancelled — ${reason}`);
            o.cancelReason = reason;
            const p = db.payments.find((x) => x.id === o.paymentId)!;
            if (p.status === 'verified') {
              p.status = 'refund_pending';
              p.refund = { amount: p.amountDue, reason: `Order cancelled: ${reason}`, status: 'pending', by: staffOf(db, s).name, at: Date.now() };
            }
            audit(db, s, 'Order cancelled', o.id, prev, 'Cancelled', reason);
            emit(db, 'Admin Dashboard', 'order.cancelled', `${o.id} · ${reason}`);
            notify(db, { audience: 'customer', recipientId: o.customerId, type: 'Order cancelled', message: `${o.id} was cancelled: ${reason}${p.status === 'refund_pending' ? '. A refund is being processed.' : ''}`, severity: 'warning' });
            return { ok: true };
          }),

        resolveException: (orderId, resolution) =>
          act((db, s) => {
            const g = guard(db, s, 'orders.resolve', 'resolve delivery exceptions'); if (g) return g;
            const o = db.orders.find((x) => x.id === orderId);
            if (!o || !['partially_delivered', 'delivery_failed'].includes(o.status)) return fail('Only partial or failed deliveries need resolution.');
            const outstanding = o.qty - (o.deliveredQty ?? 0);
            const p = db.payments.find((x) => x.id === o.paymentId)!;
            const u = staffOf(db, s);
            if (resolution === 'refund') {
              const amount = outstanding * o.unitPrice + (o.status === 'delivery_failed' ? o.deliveryFee : 0);
              p.refund = { amount, reason: `Outstanding ${litres(outstanding)} on ${o.id}`, status: 'pending', by: u.name, at: Date.now() };
              setOrderStatus(o, o.status === 'delivery_failed' ? 'cancelled' : 'completed', u.name, `Resolved — outstanding ${litres(outstanding)} to be refunded (${naira(amount)})`);
              notify(db, { audience: 'admin', type: 'Refund requires review', message: `${o.id} — refund ${naira(amount)} for outstanding quantity`, severity: 'warning', link: '/admin/payments' });
            } else {
              const nid = `PAC-${++db.counters.order}`;
              const payId = `PAY-${++db.counters.pay}`;
              db.payments.unshift({ id: payId, orderId: nid, customerId: o.customerId, amountDue: 0, amountSubmitted: 0, method: o.paymentMethod, reference: `CARRY/${o.id}`, status: 'verified', verifiedBy: `Carried over from ${o.id}`, verifiedAt: Date.now(), createdAt: Date.now() });
              db.orders.unshift({
                ...structuredClone(o), id: nid, qty: outstanding, total: 0, deliveryFee: 0, paymentId: payId, status: 'confirmed', tripId: undefined, deliveredQty: undefined,
                outcomeReason: undefined, createdAt: Date.now(), deliveryOtp: String(1000 + Math.floor(Math.random() * 9000)),
                timeline: [{ at: Date.now(), label: `Redelivery of outstanding ${litres(outstanding)} from ${o.id} — prepaid, confirmed`, by: u.name }],
              });
              setOrderStatus(o, 'completed', u.name, `Resolved — outstanding ${litres(outstanding)} rescheduled as ${nid}`);
            }
            audit(db, s, 'Delivery exception resolved', o.id, `Outstanding ${litres(outstanding)}`, resolution === 'refund' ? 'Refund' : 'Redelivery scheduled');
            emit(db, 'Admin Dashboard', 'order.exception_resolved', `${o.id} · ${resolution}`);
            notify(db, { audience: 'customer', recipientId: o.customerId, type: 'Order update', message: resolution === 'refund' ? `The outstanding ${litres(outstanding)} on ${o.id} will be refunded.` : `The outstanding ${litres(outstanding)} on ${o.id} has been rescheduled for delivery.`, severity: 'info' });
            return { ok: true };
          }),

        // ===================== ADMIN — ASSIGN DRIVER =====================
        // One action: pick a driver for a confirmed order. The driver's own truck goes with them.
        // If the driver already has a trip that hasn't started, the order joins it as another stop.
        assignOrderToDriver: (orderId, driverId) =>
          act((db, s) => {
            const g = guard(db, s, 'dispatch.create', 'assign drivers to orders'); if (g) return g;
            const o = db.orders.find((x) => x.id === orderId);
            if (!o) return fail('Order not found.');
            if (['awaiting_confirmation', 'awaiting_payment', 'payment_verification', 'received'].includes(o.status))
              return fail(`Confirm ${o.id} first — then you can assign a driver.`);
            if (o.status !== 'confirmed') return fail(`${o.id} is "${orderStatusMeta[o.status].label}" — it can't be assigned now.`);
            const d = db.drivers.find((x) => x.id === driverId && !x.removed);
            if (!d) return fail('Select a driver.');
            if (d.status !== 'active') return fail(`${d.name} is ${d.status.replace('_', ' ')} and can't receive deliveries.`);
            if (db.trips.some((t) => t.driverId === d.id && t.status === 'in_transit')) return fail(`${d.name} is already on the road. Assign this after their current trip is finished.`);
            const v = d.vehicleId ? db.vehicles.find((x) => x.id === d.vehicleId && !x.removed) : undefined;
            if (!v) return fail(`${d.name} has no truck. Assign a truck to them on the Drivers page first.`);
            if (!['available', 'assigned'].includes(v.status)) return fail(`${v.reg} is ${v.status.replace('_', ' ')} — it can't be used for deliveries.`);
            const need = truckCommitted(db, v.id) + o.qty;
            if (need > v.fuel) return fail(`${v.reg} has ${litres(v.fuel)} on board but needs ${litres(need)} for its deliveries. Load fuel into the truck on the Inventory page first.`);
            const u = staffOf(db, s);
            let t = db.trips.find((x) => x.driverId === d.id && ['assigned', 'acknowledged'].includes(x.status));
            if (t) {
              t.stops.push({ id: uid(db, 'ST'), seq: t.stops.length + 1, orderId: o.id, orderedQty: o.qty, status: 'pending' });
              t.allocatedQty += o.qty;
              t.status = 'assigned'; // driver accepts the updated trip
            } else {
              t = {
                id: `TRP-${String(++db.counters.trip).padStart(4, '0')}`, vehicleId: v.id, driverId: d.id, allocatedQty: o.qty, status: 'assigned',
                createdAt: Date.now(), createdBy: u.name, stops: [{ id: uid(db, 'ST'), seq: 1, orderId: o.id, orderedQty: o.qty, status: 'pending' }],
                gps: { pos: { ...DEPOT.pos }, updatedAt: Date.now(), state: 'none' },
              };
              db.trips.unshift(t);
              v.status = 'assigned';
            }
            o.tripId = t.id;
            setOrderStatus(o, 'assigned', u.name, `Driver assigned — ${d.name} · ${v.reg}`);
            audit(db, s, 'Driver assigned to order', o.id, 'Confirmed', `${d.name} · ${v.reg} · ${t.id} stop ${t.stops.length}`);
            emit(db, 'Admin Dashboard', 'order.driver_assigned', `${o.id} → ${d.name} / ${v.reg} (${t.id}, ${t.stops.length} stop${t.stops.length > 1 ? 's' : ''})`);
            emit(db, 'Backend', 'push.sent → Driver App', `${d.name}: new delivery ${o.id}`);
            notify(db, { audience: 'driver', recipientId: d.id, type: 'New delivery assigned', message: `${o.id} — ${litres(o.qty)} to ${o.address.area}. Open the app to accept.`, severity: 'warning' });
            notify(db, { audience: 'customer', recipientId: o.customerId, type: 'Driver assigned', message: `${d.name} will deliver ${o.id}.`, severity: 'info' });
            return { ok: true, id: t.id };
          }),

        removeOrderFromTrip: (orderId, reason) =>
          act((db, s) => {
            const g = guard(db, s, 'dispatch.create', 'change driver assignments'); if (g) return g;
            const o = db.orders.find((x) => x.id === orderId);
            const t = o?.tripId ? db.trips.find((x) => x.id === o.tripId) : undefined;
            if (!o || !t) return fail('Order has no driver.');
            if (!['assigned', 'acknowledged'].includes(t.status)) return fail('The driver has already started — it can no longer be unassigned.');
            const why = reason.trim() || 'Reassigned by admin';
            const u = staffOf(db, s);
            const d = db.drivers.find((x) => x.id === t.driverId)!;
            t.stops = t.stops.filter((st) => st.orderId !== o.id).map((st, i) => ({ ...st, seq: i + 1 }));
            t.allocatedQty -= o.qty;
            o.tripId = undefined;
            setOrderStatus(o, 'confirmed', u.name, `Driver unassigned — ${why}`);
            if (!t.stops.length) {
              t.status = 'cancelled';
              const v = db.vehicles.find((x) => x.id === t.vehicleId); if (v && v.status === 'assigned') v.status = 'available';
            }
            audit(db, s, 'Driver unassigned from order', o.id, d.name, 'Confirmed (no driver)', why);
            emit(db, 'Admin Dashboard', 'order.driver_unassigned', `${o.id} removed from ${d.name}`);
            notify(db, { audience: 'driver', recipientId: d.id, type: 'Delivery removed', message: `${o.id} was taken off your list: ${why}`, severity: 'warning' });
            return { ok: true };
          }),

        // ===================== ADMIN — INVENTORY =====================
        recordReceipt: (qty, supplier, ref) =>
          act((db, s) => {
            const g = guard(db, s, 'inventory.receive', 'record stock receipts'); if (g) return g;
            if (!Number.isInteger(qty) || qty <= 0) return fail('Enter a valid quantity.');
            if (!supplier.trim() || !ref.trim()) return fail('Supplier and supporting reference are required.');
            const before = depotStock(db);
            const u = staffOf(db, s);
            db.movements.unshift({ id: `MV-${++db.counters.mov}`, type: 'receipt', qty, ref: `${ref} · Supplier: ${supplier}`, by: u.name, at: Date.now() });
            audit(db, s, 'Stock receipt recorded', ref, litres(before), litres(before + qty));
            emit(db, 'Admin Dashboard', 'inventory.receipt', `+${litres(qty)} · ${supplier}`);
            return { ok: true };
          }),

        loadTruck: (vehicleId, qty) =>
          act((db, s) => {
            const g = guard(db, s, 'inventory.load', 'load fuel into trucks'); if (g) return g;
            const v = db.vehicles.find((x) => x.id === vehicleId && !x.removed);
            if (!v) return fail('Select a truck.');
            if (!Number.isInteger(qty) || qty <= 0) return fail('Enter how many litres to load.');
            if (v.status === 'on_trip') return fail(`${v.reg} is on the road — load it when it is back at the depot.`);
            if (v.fuel + qty > v.capacity) return fail(`${v.reg} holds ${litres(v.capacity)} and already has ${litres(v.fuel)} — you can add at most ${litres(v.capacity - v.fuel)}.`);
            if (qty > depotStock(db)) return fail(`The depot only has ${litres(depotStock(db))}.`);
            const u = staffOf(db, s);
            const before = v.fuel;
            v.fuel += qty;
            db.movements.unshift({ id: `MV-${++db.counters.mov}`, type: 'load', qty: -qty, ref: `Depot → ${v.reg}`, by: u.name, at: Date.now() });
            audit(db, s, 'Fuel loaded into truck', v.reg, `${litres(before)} on board`, `${litres(v.fuel)} on board`);
            emit(db, 'Admin Dashboard', 'inventory.truck_loaded', `${v.reg} +${litres(qty)} → ${litres(v.fuel)} on board`);
            return { ok: true };
          }),

        unloadTruck: (vehicleId, qty) =>
          act((db, s) => {
            const g = guard(db, s, 'inventory.load', 'unload fuel from trucks'); if (g) return g;
            const v = db.vehicles.find((x) => x.id === vehicleId && !x.removed);
            if (!v) return fail('Select a truck.');
            if (!Number.isInteger(qty) || qty <= 0) return fail('Enter how many litres to unload.');
            if (v.status === 'on_trip') return fail(`${v.reg} is on the road — unload it when it is back at the depot.`);
            const free = v.fuel - truckCommitted(db, v.id);
            if (qty > free) return fail(`Only ${litres(free)} on ${v.reg} is free — the rest is needed for deliveries already assigned to it.`);
            const u = staffOf(db, s);
            const before = v.fuel;
            v.fuel -= qty;
            db.movements.unshift({ id: `MV-${++db.counters.mov}`, type: 'unload', qty, ref: `${v.reg} → Depot`, by: u.name, at: Date.now() });
            audit(db, s, 'Fuel unloaded from truck', v.reg, `${litres(before)} on board`, `${litres(v.fuel)} on board`);
            emit(db, 'Admin Dashboard', 'inventory.truck_unloaded', `${v.reg} −${litres(qty)} → back to depot`);
            return { ok: true };
          }),

        // ===================== ADMIN — SETTINGS =====================
        updatePrice: (field, value, reason) =>
          act((db, s) => {
            const g = guard(db, s, 'pricing.manage', 'change prices'); if (g) return g;
            if (!Number.isFinite(value) || value <= 0) return fail('Enter a valid amount.');
            if (!reason.trim()) return fail('A reason is required for price changes.');
            const from = db.settings[field];
            db.settings[field] = value;
            db.settings.priceHistory.unshift({ at: Date.now(), by: staffOf(db, s).name, field, from, to: value, reason });
            audit(db, s, field === 'unitPrice' ? 'Price changed' : 'Delivery fee changed', field === 'unitPrice' ? 'PMS unit price' : 'Delivery fee', naira(from), naira(value), reason);
            emit(db, 'Admin Dashboard', 'pricing.updated', `${field} ${naira(from)} → ${naira(value)} · applies to NEW orders only`);
            return { ok: true };
          }),

        updateSettings: (patch, label) =>
          act((db, s) => {
            const g = guard(db, s, 'settings.manage', 'change system settings'); if (g) return g;
            const before = JSON.stringify(Object.fromEntries(Object.keys(patch).map((k) => [k, (db.settings as any)[k]])));
            Object.assign(db.settings, patch);
            audit(db, s, 'Configuration changed', label, before, JSON.stringify(patch));
            emit(db, 'Admin Dashboard', 'settings.updated', label);
            return { ok: true };
          }),

        // ===================== ADMIN — PEOPLE & FLEET =====================
        setDriverStatus: (driverId, status, reason) =>
          act((db, s) => {
            const g = guard(db, s, 'drivers.manage', 'manage drivers'); if (g) return g;
            const d = db.drivers.find((x) => x.id === driverId);
            if (!d) return fail('Driver not found.');
            if (status === 'suspended' && !reason.trim()) return fail('Suspension requires a reason.');
            const prev = d.status; d.status = status;
            if (status !== 'active' && hasActiveTrip(db, (t) => t.driverId === d.id && t.status === 'in_transit')) return fail(`${d.name} is on the road — wait until the trip is finished.`);
            if (status !== 'active' && hasActiveTrip(db, (t) => t.driverId === d.id)) return fail(`${d.name} has deliveries assigned — unassign them first.`);
            audit(db, s, status === 'active' && prev === 'pending_approval' ? 'Driver approved' : `Driver ${status}`, `${d.id} ${d.name}`, prev, status, reason);
            notify(db, { audience: 'driver', recipientId: d.id, type: 'Account update', message: `Your account status is now: ${status.replace('_', ' ')}`, severity: status === 'active' ? 'success' : 'warning' });
            return { ok: true };
          }),

        setVehicleStatus: (vehicleId, status, reason) =>
          act((db, s) => {
            const g = guard(db, s, 'vehicles.manage', 'manage vehicles'); if (g) return g;
            const v = db.vehicles.find((x) => x.id === vehicleId);
            if (!v) return fail('Vehicle not found.');
            if (['assigned', 'on_trip'].includes(v.status)) return fail('Vehicle has an active trip — status is controlled by the trip lifecycle.');
            if (!reason.trim()) return fail('A reason is required.');
            const prev = v.status; v.status = status;
            audit(db, s, 'Vehicle status changed', v.reg, prev, status, reason);
            if (status !== 'available') notify(db, { audience: 'admin', type: 'Vehicle unavailable', message: `${v.reg} is now ${status}: ${reason}`, severity: 'critical', link: '/admin/vehicles' });
            return { ok: true };
          }),

        addVehicle: (reg, capacity) =>
          act((db, s) => {
            const g = guard(db, s, 'vehicles.manage', 'add vehicles'); if (g) return g;
            const r = reg.trim().toUpperCase();
            if (!r || !(capacity > 0)) return fail('Registration and capacity are required.');
            if (db.vehicles.some((v) => !v.removed && v.reg === r)) return fail(`A truck with registration ${r} already exists.`);
            const id = nextId('V', db.vehicles.map((v) => v.id));
            db.vehicles.push({ id, reg: r, type: 'PMS Tanker', capacity, fuel: 0, status: 'available', lastInspection: new Date().toISOString().slice(0, 10) });
            audit(db, s, 'Truck added', `${id} ${r}`, undefined, `Capacity ${litres(capacity)}`);
            emit(db, 'Admin Dashboard', 'fleet.vehicle_added', `${r} · ${litres(capacity)}`);
            return { ok: true, id };
          }),

        deleteVehicle: (vehicleId, reason) =>
          act((db, s) => {
            const g = guard(db, s, 'vehicles.manage', 'delete trucks'); if (g) return g;
            if (!reason.trim()) return fail('A reason is required to delete a truck.');
            const v = db.vehicles.find((x) => x.id === vehicleId && !x.removed);
            if (!v) return fail('Truck not found.');
            if (hasActiveTrip(db, (t) => t.vehicleId === v.id)) return fail(`${v.reg} has deliveries assigned — it can't be deleted until they are finished.`);
            if (v.fuel > 0) return fail(`${v.reg} still has ${litres(v.fuel)} on board. Unload it back to the depot (Inventory page) before deleting the truck.`);
            pair(db, null, v.id);
            const kept = db.trips.some((t) => t.vehicleId === v.id);
            if (kept) { v.removed = true; v.status = 'unavailable'; } else db.vehicles = db.vehicles.filter((x) => x.id !== v.id);
            audit(db, s, 'Truck deleted', `${v.id} ${v.reg}`, v.status, kept ? 'Removed (archived — trip history retained)' : 'Removed', reason);
            emit(db, 'Admin Dashboard', 'fleet.vehicle_removed', `${v.reg}${kept ? ' · archived for history' : ''}`);
            return { ok: true };
          }),

        addDriver: ({ name, phone, licenceNo, licenceExpiry, vehicleId }) =>
          act((db, s) => {
            const g = guard(db, s, 'drivers.manage', 'add drivers'); if (g) return g;
            if (!name.trim() || !phone.trim() || !licenceNo.trim() || !licenceExpiry) return fail('Name, phone, licence number and licence expiry are required.');
            if (db.drivers.some((d) => !d.removed && d.phone.replace(/\s/g, '') === phone.replace(/\s/g, ''))) return fail('A driver with this phone number already exists.');
            if (new Date(licenceExpiry).getTime() < Date.now()) return fail('Licence has expired — the driver cannot be added as active.');
            if (vehicleId && hasActiveTrip(db, (t) => t.vehicleId === vehicleId)) return fail('That truck has deliveries assigned — change it after the trip is finished.');
            const id = nextId('D', db.drivers.map((d) => d.id));
            db.drivers.push({ id, name: name.trim(), phone: phone.trim(), status: 'active', duty: 'available', licenceNo: licenceNo.trim(), licenceExpiry, joinedAt: Date.now() });
            if (vehicleId) pair(db, id, vehicleId);
            audit(db, s, 'Driver added', `${id} ${name.trim()}`, undefined, `Active${vehicleId ? ` · truck ${db.vehicles.find((v) => v.id === vehicleId)?.reg}` : ''}`);
            emit(db, 'Admin Dashboard', 'driver.created', `${id} ${name.trim()} · login invite sent to ${phone.trim()}`);
            return { ok: true, id };
          }),

        deleteDriver: (driverId, reason) =>
          act((db, s) => {
            const g = guard(db, s, 'drivers.manage', 'delete drivers'); if (g) return g;
            if (!reason.trim()) return fail('A reason is required to delete a driver.');
            const d = db.drivers.find((x) => x.id === driverId && !x.removed);
            if (!d) return fail('Driver not found.');
            if (hasActiveTrip(db, (t) => t.driverId === d.id)) return fail(`${d.name} has deliveries assigned — unassign them or let the trip finish first.`);
            pair(db, d.id, null);
            const kept = db.trips.some((t) => t.driverId === d.id);
            if (kept) { d.removed = true; d.status = 'deactivated'; d.duty = 'off_duty'; } else db.drivers = db.drivers.filter((x) => x.id !== d.id);
            audit(db, s, 'Driver deleted', `${d.id} ${d.name}`, d.status, kept ? 'Removed (archived — trip history retained)' : 'Removed', reason);
            emit(db, 'Admin Dashboard', 'driver.removed', `${d.name} · app access revoked`);
            return { ok: true };
          }),

        assignDriverToVehicle: (driverId, vehicleId) =>
          act((db, s) => {
            const g = guard(db, s, 'drivers.manage', 'assign drivers to trucks'); if (g) return g;
            const d = driverId ? db.drivers.find((x) => x.id === driverId && !x.removed) : undefined;
            const v = vehicleId ? db.vehicles.find((x) => x.id === vehicleId && !x.removed) : undefined;
            if (!d && !v) return fail('Select a driver or a truck.');
            const involved = [d?.id, d?.vehicleId, v?.id, v?.driverId];
            if (hasActiveTrip(db, (t) => involved.includes(t.driverId) || involved.includes(t.vehicleId)))
              return fail('A driver or truck involved has deliveries assigned — change the pairing after the trip is finished.');
            if (d && d.status !== 'active' && v) return fail(`${d.name} is ${d.status.replace('_', ' ')} — only active drivers can be put on a truck.`);
            const before = d ? db.vehicles.find((x) => x.id === d.vehicleId)?.reg ?? 'No truck' : db.drivers.find((x) => x.id === v!.driverId)?.name ?? 'No driver';
            pair(db, d?.id ?? null, v?.id ?? null);
            const after = d && v ? `${d.name} → ${v.reg}` : d ? `${d.name} → no truck` : `${v!.reg} → no driver`;
            audit(db, s, d && v ? 'Driver assigned to truck' : 'Driver unassigned from truck', after, before, after);
            emit(db, 'Admin Dashboard', 'fleet.pairing', after);
            if (d) notify(db, { audience: 'driver', recipientId: d.id, type: 'Truck assignment', message: v ? `You are now assigned to ${v.reg} (${litres(v.capacity)}).` : 'You are no longer assigned to a truck.', severity: 'info' });
            return { ok: true };
          }),

        setCustomerStatus: (customerId, status, reason) =>
          act((db, s) => {
            const g = guard(db, s, 'customers.suspend', 'suspend customer accounts'); if (g) return g;
            if (!reason.trim()) return fail('A reason is required.');
            const c = db.customers.find((x) => x.id === customerId)!;
            const prev = c.status; c.status = status;
            audit(db, s, status === 'suspended' ? 'Account suspended' : 'Account reactivated', `${c.id} ${c.name}`, prev, status, reason);
            return { ok: true };
          }),

        updateComplaint: (id, status, note, internal) =>
          act((db, s) => {
            const g = guard(db, s, 'complaints.manage', 'update complaints'); if (g) return g;
            const c = db.complaints.find((x) => x.id === id)!;
            const u = staffOf(db, s);
            const prev = c.status; c.status = status; c.assignedTo = c.assignedTo ?? u.name;
            if (note.trim()) c.notes.push({ at: Date.now(), by: u.name, text: note, internal });
            audit(db, s, 'Complaint updated', c.id, prev, status, note || undefined);
            if (!internal || prev !== status)
              notify(db, { audience: 'customer', recipientId: c.customerId, type: 'Support update', message: `${c.id}: ${status.replace('_', ' ')}${!internal && note ? ` — ${note}` : ''}`, severity: 'info' });
            return { ok: true };
          }),

        setGpsState: (tripId, state) =>
          act((db) => {
            const t = db.trips.find((x) => x.id === tripId);
            if (!t) return fail('Trip not found.');
            t.gps.state = state;
            if (state === 'live') t.gps.updatedAt = Date.now();
            emit(db, 'GPS', 'gps.state', `${tripId} · ${state}`);
            if (state !== 'live') notify(db, { audience: 'admin', type: 'GPS problem', message: `${tripId}: GPS ${state.replace('_', ' ')} — showing last known position only`, severity: 'warning', link: '/admin/tracking' });
            return { ok: true };
          }),

        // ===================== DRIVER APP =====================
        acknowledgeTrip: (tripId) =>
          act((db, s) => {
            const t = db.trips.find((x) => x.id === tripId);
            if (!t || t.driverId !== s.driverId) return fail('403 — this trip is not assigned to you.');
            if (t.status !== 'assigned') return fail('Already accepted.');
            t.status = 'acknowledged'; t.acknowledgedAt = Date.now();
            const d = db.drivers.find((x) => x.id === s.driverId)!;
            auditAs(db, d.name, 'Driver', 'Delivery accepted', t.id);
            emit(db, 'Driver App', 'trip.accepted', `${t.id} · ${d.name} · ${t.stops.length} stop(s)`);
            return { ok: true };
          }),

        startTrip: (tripId) =>
          act((db, s) => {
            const t = db.trips.find((x) => x.id === tripId);
            if (!t || t.driverId !== s.driverId) return fail('403 — this trip is not assigned to you.');
            if (t.status !== 'acknowledged') return fail('Accept the delivery first.');
            const v = db.vehicles.find((x) => x.id === t.vehicleId)!;
            if (v.fuel < t.allocatedQty) return fail(`${v.reg} has ${litres(v.fuel)} on board but these deliveries need ${litres(t.allocatedQty)}. Ask the depot to load the truck.`);
            const d = db.drivers.find((x) => x.id === s.driverId)!;
            t.status = 'in_transit'; t.startedAt = Date.now();
            t.gps = { pos: { ...DEPOT.pos }, updatedAt: Date.now(), state: 'live' };
            v.status = 'on_trip'; d.duty = 'on_trip';
            t.stops.forEach((st) => {
              const o = db.orders.find((x) => x.id === st.orderId)!;
              setOrderStatus(o, 'out_for_delivery', 'Driver App', 'Out for delivery');
              notify(db, { audience: 'customer', recipientId: o.customerId, type: 'Out for delivery', message: `${o.id} is on the way. Give the driver your delivery code once the petrol is in your tank.`, severity: 'info' });
            });
            auditAs(db, d.name, 'Driver', 'Trip started', t.id, 'Accepted', 'On the road');
            emit(db, 'Driver App', 'trip.started', `${t.id} · ${v.reg} leaves the depot · GPS tracking on`);
            return { ok: true };
          }),

        completeStop: (tripId, stopId, qty, otp, reason) =>
          act((db, s) => {
            const t = db.trips.find((x) => x.id === tripId);
            if (!t || t.driverId !== s.driverId) return fail('403 — this trip is not assigned to you.');
            if (t.status !== 'in_transit') return fail('Start the trip first.');
            const st = t.stops.find((x) => x.id === stopId)!;
            if (st.status !== 'pending') return fail('This delivery is already recorded.');
            if (!Number.isFinite(qty) || qty <= 0) return fail('Enter the litres you dispensed. If nothing was delivered, use "Couldn’t deliver".');
            if (qty > st.orderedQty) return fail(`${litres(qty)} is more than the ${litres(st.orderedQty)} ordered.`);
            const v = db.vehicles.find((x) => x.id === t.vehicleId)!;
            if (qty > v.fuel) return fail(`Only ${litres(v.fuel)} left on ${v.reg}.`);
            const o = db.orders.find((x) => x.id === st.orderId)!;
            if (otp !== o.deliveryOtp) return fail('Wrong code. Ask the customer for the 4-digit code in their app.');
            const partial = qty < st.orderedQty;
            if (partial && !reason?.trim()) return fail('Select why less was delivered.');
            const d = db.drivers.find((x) => x.id === s.driverId)!;
            st.deliveredQty = qty; st.completedAt = Date.now(); st.pod = { method: 'customer_otp', at: Date.now() };
            st.status = partial ? 'partial' : 'delivered'; st.reason = reason;
            o.deliveredQty = qty;
            v.fuel -= qty;
            if (t.gps.state === 'live') { t.gps.pos = { ...o.address.pos }; t.gps.updatedAt = Date.now(); }
            if (partial) {
              o.outcomeReason = reason;
              setOrderStatus(o, 'partially_delivered', 'Driver App', `Partially delivered — ${litres(qty)} of ${litres(o.qty)} (${reason})`);
              notify(db, { audience: 'admin', type: 'Partial delivery', message: `${o.id}: ${litres(o.qty - qty)} outstanding — ${reason}`, severity: 'critical', link: `/admin/orders?open=${o.id}` });
              notify(db, { audience: 'customer', recipientId: o.customerId, type: 'Partially delivered', message: `${litres(qty)} of ${litres(o.qty)} delivered for ${o.id}. We’ll contact you about the remaining ${litres(o.qty - qty)}.`, severity: 'warning' });
            } else {
              setOrderStatus(o, 'delivered', 'Driver App', `Delivered — ${litres(qty)} (customer code confirmed)`);
              notify(db, { audience: 'customer', recipientId: o.customerId, type: 'Delivered', message: `${litres(qty)} delivered for ${o.id}. Thank you!`, severity: 'success' });
            }
            auditAs(db, d.name, 'Driver', partial ? 'Partial delivery recorded' : 'Delivery recorded', `${o.id} (${t.id})`, `Ordered ${litres(o.qty)}`, `Delivered ${litres(qty)}`, reason);
            emit(db, 'Driver App', partial ? 'stop.partial' : 'stop.delivered', `${o.id} · ${litres(qty)} · code ✓ · ${litres(v.fuel)} left on ${v.reg}`);
            finishTripIfDone(db, t);
            return { ok: true };
          }),

        failStop: (tripId, stopId, reason) =>
          act((db, s) => {
            const t = db.trips.find((x) => x.id === tripId);
            if (!t || t.driverId !== s.driverId) return fail('403 — this trip is not assigned to you.');
            if (t.status !== 'in_transit') return fail('Start the trip first.');
            if (!reason.trim()) return fail('Select a reason.');
            const st = t.stops.find((x) => x.id === stopId)!;
            if (st.status !== 'pending') return fail('This delivery is already recorded.');
            const o = db.orders.find((x) => x.id === st.orderId)!;
            const d = db.drivers.find((x) => x.id === s.driverId)!;
            st.status = 'failed'; st.deliveredQty = 0; st.reason = reason; st.completedAt = Date.now();
            o.deliveredQty = 0; o.outcomeReason = reason;
            setOrderStatus(o, 'delivery_failed', 'Driver App', `Delivery failed — ${reason}`);
            auditAs(db, d.name, 'Driver', 'Failed delivery reported', `${o.id} (${t.id})`, undefined, undefined, reason);
            emit(db, 'Driver App', 'stop.failed', `${o.id} · ${reason} · fuel stays on the truck`);
            notify(db, { audience: 'admin', type: 'Delivery failed', message: `${o.id}: ${reason}`, severity: 'critical', link: `/admin/orders?open=${o.id}` });
            notify(db, { audience: 'customer', recipientId: o.customerId, type: 'Delivery unsuccessful', message: `We couldn't complete delivery of ${o.id} (${reason}). Support will contact you.`, severity: 'warning' });
            finishTripIfDone(db, t);
            return { ok: true };
          }),

        reportIncident: (tripId, category, text) =>
          act((db, s) => {
            const d = db.drivers.find((x) => x.id === s.driverId)!;
            if (!text.trim()) return fail('Describe the incident.');
            emit(db, 'Driver App', 'incident.reported', `${tripId} · ${category}`);
            notify(db, { audience: 'admin', type: `Driver incident: ${category}`, message: `${d.name} (${tripId}): ${text}`, severity: 'critical', link: '/admin/tracking' });
            auditAs(db, d.name, 'Driver', 'Incident reported', tripId, undefined, category, text);
            return { ok: true };
          }),

        // ===================== GPS SIMULATION =====================
        gpsTick: () => {
          const db = get().db;
          const moving = db.trips.filter((t) => t.status === 'in_transit' && t.gps.state === 'live');
          if (!moving.length) return;
          const draft = structuredClone(db);
          for (const t of draft.trips) {
            if (!moving.some((m) => m.id === t.id)) continue;
            const next = t.stops.find((st) => st.status === 'pending');
            const target = next ? draft.orders.find((o) => o.id === next.orderId)!.address.pos : DEPOT.pos;
            const dx = target.x - t.gps.pos.x, dy = target.y - t.gps.pos.y;
            const dist = Math.hypot(dx, dy);
            const step = 22;
            t.gps.pos = dist <= step ? { ...target } : { x: t.gps.pos.x + (dx / dist) * step, y: t.gps.pos.y + (dy / dist) * step };
            t.gps.updatedAt = Date.now();
          }
          set({ db: draft });
        },
      };
    },
    {
      name: 'pac-petrol-demo-v2', // v2: simplified flow (truck fuel, no reconciliation step)
      partialize: (s) => ({ db: s.db, session: s.session }),
    },
  ),
);

// Keep multiple open tabs (e.g. Admin in one window, Customer App in another) in sync —
// a stand-in for the realtime WebSocket channel of the production backend.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'pac-petrol-demo-v2') useStore.persist.rehydrate();
  });
}
