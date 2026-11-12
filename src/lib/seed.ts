// Seed data for the demo. All prices/fees are ILLUSTRATIVE (spec examples) — pending management approval.
import type {
  Address, AppNotification, AuditEntry, Complaint, Customer, Driver, Order, Payment, Settings,
  StaffUser, StockMovement, SystemEvent, Trip, Vehicle, Point, OrderStatus, TimelineEvent,
} from './types';

export const DEPOT: { name: string; pos: Point } = { name: 'PAC Depot — Ijora', pos: { x: 300, y: 372 } };

// Positions on the schematic Lagos map (viewBox 0 0 1000 620)
export const AREAS: Record<string, Point> = {
  'Ikeja GRA': { x: 330, y: 118 },
  Magodo: { x: 520, y: 92 },
  Maryland: { x: 392, y: 190 },
  Gbagada: { x: 478, y: 205 },
  Yaba: { x: 425, y: 292 },
  Surulere: { x: 300, y: 282 },
  Ikoyi: { x: 575, y: 432 },
  'Victoria Island': { x: 505, y: 476 },
  'Lekki Phase 1': { x: 680, y: 462 },
  'Chevron, Lekki': { x: 790, y: 466 },
  Ajah: { x: 905, y: 470 },
  Badagry: { x: 60, y: 420 }, // outside service area — used to demo rejection
};

export interface DailyStat { day: string; orders: number; litres: number; revenue: number; failed: number; partial: number }
export interface DB {
  version: number;
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
  trips: Trip[];
  drivers: Driver[];
  vehicles: Vehicle[];
  staff: StaffUser[];
  movements: StockMovement[];
  complaints: Complaint[];
  notifications: AppNotification[];
  audit: AuditEntry[];
  events: SystemEvent[];
  settings: Settings;
  history: DailyStat[];
  idempotency: Record<string, string>;
  counters: { order: number; trip: number; pay: number; cmp: number; mov: number; seq: number };
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const addr = (id: string, label: string, kind: Address['kind'], line: string, area: string, extra: Partial<Address> = {}): Address => ({
  id, label, kind, line, area, pos: AREAS[area], ...extra,
});

export function createSeed(): DB {
  const now = Date.now();
  const t = (msAgo: number) => now - msAgo;

  const staff: StaffUser[] = [
    { id: 'S-01', name: 'Adaeze Okafor', role: 'super_admin', email: 'adaeze@pacpetrol.ng' },
    { id: 'S-02', name: 'Kunle Adeyemi', role: 'operations', email: 'kunle@pacpetrol.ng' },
    { id: 'S-03', name: 'Ngozi Eze', role: 'finance', email: 'ngozi@pacpetrol.ng' },
    { id: 'S-04', name: 'Musa Bello', role: 'inventory', email: 'musa@pacpetrol.ng' },
    { id: 'S-05', name: 'Funke Adewale', role: 'support', email: 'funke@pacpetrol.ng' },
  ];

  const customers: Customer[] = [
    {
      id: 'C-1001', name: 'Tolu Bakare', phone: '+234 803 412 7781', email: 'tolu.bakare@mail.ng', category: 'household',
      status: 'active', verified: true, registeredAt: t(40 * DAY),
      addresses: [
        addr('A-1', 'Home', 'home', '12 Admiralty Way', 'Lekki Phase 1', { landmark: 'Opposite Mega Plaza', instructions: 'Generator house is at the back. Call on arrival.' }),
        addr('A-2', 'Office', 'office', 'Plot 7 Adeola Odeku Street', 'Victoria Island', { landmark: 'Beside the bank', instructions: 'Ask for facility manager at reception.' }),
      ],
    },
    { id: 'C-1002', name: 'Chinedu Okeke', phone: '+234 806 220 1934', email: 'okeke.bakery@mail.ng', category: 'business', status: 'active', verified: true, registeredAt: t(60 * DAY),
      addresses: [addr('A-3', 'Okeke Bakery', 'business', '45 Adeniran Ogunsanya Street', 'Surulere', { instructions: 'Diesel and PMS tanks are separate — PMS tank is labelled green.' })] },
    { id: 'C-1003', name: 'Aisha Bello', phone: '+234 809 551 0042', email: 'aisha.b@mail.ng', category: 'household', status: 'active', verified: true, registeredAt: t(25 * DAY),
      addresses: [addr('A-4', 'Home', 'home', '3 Bourdillon Road', 'Ikoyi', { landmark: 'Estate gate 2' })] },
    { id: 'C-1004', name: 'Femi Adebayo', phone: '+234 802 778 6610', email: 'adebayo.coldrooms@mail.ng', category: 'business', status: 'active', verified: true, registeredAt: t(80 * DAY),
      addresses: [addr('A-5', 'Adebayo Cold Rooms', 'business', '18 Isaac John Street', 'Ikeja GRA', { instructions: 'Deliveries accepted 8am–4pm only.' })] },
    { id: 'C-1005', name: 'Grace Etim', phone: '+234 815 330 9087', email: 'grace.etim@mail.ng', category: 'household', status: 'active', verified: true, registeredAt: t(12 * DAY),
      addresses: [addr('A-6', 'Home', 'home', '9 Herbert Macaulay Way', 'Yaba')] },
    { id: 'C-1006', name: 'Sola Martins', phone: '+234 818 004 5521', email: 'martins.events@mail.ng', category: 'business', status: 'active', verified: true, registeredAt: t(50 * DAY),
      addresses: [addr('A-7', 'Martins Event Centre', 'business', 'Km 22 Lekki–Epe Expressway', 'Ajah')] },
    { id: 'C-1007', name: 'Halima Yusuf', phone: '+234 807 991 2245', email: 'halima.y@mail.ng', category: 'household', status: 'active', verified: true, registeredAt: t(18 * DAY),
      addresses: [addr('A-8', 'Home', 'home', '22 Ifako Road', 'Gbagada')] },
    { id: 'C-1008', name: 'Blessing Udo', phone: '+234 813 665 4470', email: 'udo.pharmacy@mail.ng', category: 'business', status: 'active', verified: true, registeredAt: t(33 * DAY),
      addresses: [addr('A-9', 'Udo Pharmacy', 'business', '5 Ikorodu Road', 'Maryland')] },
  ];
  const cust = (id: string) => customers.find((c) => c.id === id)!;

  const UNIT = 1000;
  const FEE = 5000;
  const orders: Order[] = [];
  const payments: Payment[] = [];
  let payN = 5000;

  const mkOrder = (o: {
    id: string; c: string; addrIdx?: number; qty: number; status: OrderStatus; ago: number; method: 'bank_transfer' | 'card';
    pay: Payment['status']; tripId?: string; deliveredQty?: number; timeline: [number, string, string][]; outcomeReason?: string; evidence?: string;
  }) => {
    const c = cust(o.c);
    const total = o.qty * UNIT + FEE;
    const payId = `PAY-${++payN}`;
    const verified = ['verified', 'refund_pending', 'refunded'].includes(o.pay);
    payments.push({
      id: payId, orderId: o.id, customerId: c.id, amountDue: total, method: o.method,
      amountSubmitted: o.pay === 'pending' || o.pay === 'failed' ? undefined : total,
      reference: o.method === 'card' ? `PSK_${o.id.slice(4)}X${payN}` : `TRF/${o.id}`,
      status: o.pay, evidence: o.evidence,
      verifiedBy: verified ? (o.method === 'card' ? 'Payment gateway webhook' : 'Ngozi Eze') : undefined,
      verifiedAt: verified ? t(o.ago - 20 * MIN) : undefined,
      createdAt: t(o.ago - 2 * MIN),
    });
    const timeline: TimelineEvent[] = o.timeline.map(([minsAfter, label, by]) => ({ at: t(o.ago - minsAfter * MIN), label, by }));
    orders.push({
      id: o.id, customerId: c.id, product: 'PMS', qty: o.qty, unitPrice: UNIT, deliveryFee: FEE, total,
      address: c.addresses[o.addrIdx ?? 0], paymentMethod: o.method, paymentId: payId, status: o.status,
      tripId: o.tripId, deliveredQty: o.deliveredQty, deliveryOtp: String(1000 + Math.floor(Math.random() * 9000)),
      createdAt: t(o.ago), timeline, outcomeReason: o.outcomeReason,
    });
  };

  const fullHistory = (extra: [number, string, string][]): [number, string, string][] => [
    [0, 'Order placed', 'Customer'],
    [0, 'Order received', 'System'],
    [15, 'Payment verified', 'Finance'],
    [40, 'Order confirmed — stock reserved', 'Operations'],
    ...extra,
  ];

  // ---- Historical trip TRP-0101 (3 days ago) ----
  mkOrder({ id: 'PAC-10231', c: 'C-1002', qty: 1000, status: 'completed', ago: 3 * DAY + 5 * HOUR, method: 'bank_transfer', pay: 'verified', tripId: 'TRP-0101', deliveredQty: 1000,
    timeline: fullHistory([[200, 'Assigned to TRP-0101', 'Operations'], [260, 'Out for delivery', 'Driver App'], [330, 'Delivered — 1,000 L (OTP confirmed)', 'Driver App'], [520, 'Order completed', 'System']]) });
  mkOrder({ id: 'PAC-10232', c: 'C-1004', qty: 1500, status: 'completed', ago: 3 * DAY + 5 * HOUR, method: 'card', pay: 'verified', tripId: 'TRP-0101', deliveredQty: 1500,
    timeline: fullHistory([[200, 'Assigned to TRP-0101', 'Operations'], [260, 'Out for delivery', 'Driver App'], [380, 'Delivered — 1,500 L (OTP confirmed)', 'Driver App'], [520, 'Order completed', 'System']]) });
  mkOrder({ id: 'PAC-10233', c: 'C-1006', qty: 1200, status: 'partially_delivered', ago: 3 * DAY + 4 * HOUR, method: 'bank_transfer', pay: 'verified', tripId: 'TRP-0101', deliveredQty: 1000,
    outcomeReason: 'Customer tank capacity reached at 1,000 L',
    timeline: fullHistory([[140, 'Assigned to TRP-0101', 'Operations'], [200, 'Out for delivery', 'Driver App'], [360, 'Partially delivered — 1,000 of 1,200 L', 'Driver App']]) });

  // ---- Historical trip TRP-0102 (yesterday) ----
  mkOrder({ id: 'PAC-10240', c: 'C-1001', qty: 200, status: 'completed', ago: 1 * DAY + 6 * HOUR, method: 'card', pay: 'verified', tripId: 'TRP-0102', deliveredQty: 200,
    timeline: fullHistory([[120, 'Assigned to TRP-0102', 'Operations'], [180, 'Out for delivery', 'Driver App'], [260, 'Delivered — 200 L (OTP confirmed)', 'Driver App'], [400, 'Order completed', 'System']]) });
  mkOrder({ id: 'PAC-10241', c: 'C-1007', qty: 500, status: 'delivery_failed', ago: 1 * DAY + 6 * HOUR, method: 'bank_transfer', pay: 'verified', tripId: 'TRP-0102', deliveredQty: 0,
    outcomeReason: 'Customer unavailable — no response after 3 calls',
    timeline: fullHistory([[120, 'Assigned to TRP-0102', 'Operations'], [180, 'Out for delivery', 'Driver App'], [300, 'Delivery failed — customer unavailable', 'Driver App']]) });
  mkOrder({ id: 'PAC-10242', c: 'C-1008', qty: 800, status: 'completed', ago: 1 * DAY + 5 * HOUR, method: 'bank_transfer', pay: 'verified', tripId: 'TRP-0102', deliveredQty: 800,
    timeline: fullHistory([[60, 'Assigned to TRP-0102', 'Operations'], [120, 'Out for delivery', 'Driver App'], [230, 'Delivered — 800 L (OTP confirmed)', 'Driver App'], [340, 'Order completed', 'System']]) });

  // ---- Current pipeline ----
  mkOrder({ id: 'PAC-10250', c: 'C-1003', qty: 1000, status: 'confirmed', ago: 3 * HOUR, method: 'card', pay: 'verified',
    timeline: [[0, 'Order placed', 'Customer'], [0, 'Order received', 'System'], [2, 'Payment verified by gateway webhook', 'Payment Gateway'], [35, 'Order confirmed — 1,000 L reserved', 'Kunle Adeyemi']] });
  mkOrder({ id: 'PAC-10251', c: 'C-1002', qty: 1500, status: 'confirmed', ago: 2 * HOUR + 30 * MIN, method: 'bank_transfer', pay: 'verified',
    timeline: [[0, 'Order placed', 'Customer'], [0, 'Order received', 'System'], [10, 'Transfer evidence submitted', 'Customer'], [42, 'Payment verified against bank statement', 'Ngozi Eze'], [60, 'Order confirmed — 1,500 L reserved', 'Kunle Adeyemi']] });
  mkOrder({ id: 'PAC-10253', c: 'C-1004', qty: 2000, status: 'awaiting_confirmation', ago: 70 * MIN, method: 'bank_transfer', pay: 'verified',
    timeline: [[0, 'Order placed', 'Customer'], [0, 'Order received', 'System'], [8, 'Transfer evidence submitted', 'Customer'], [30, 'Payment verified against bank statement', 'Ngozi Eze']] });
  mkOrder({ id: 'PAC-10252', c: 'C-1005', qty: 300, status: 'payment_verification', ago: 45 * MIN, method: 'bank_transfer', pay: 'verification_pending',
    evidence: 'GTBank transfer receipt — ₦305,000 — ref 0034581192',
    timeline: [[0, 'Order placed', 'Customer'], [0, 'Order received', 'System'], [6, 'Transfer evidence submitted — awaiting finance verification', 'Customer']] });
  mkOrder({ id: 'PAC-10254', c: 'C-1006', qty: 500, status: 'awaiting_payment', ago: 25 * MIN, method: 'bank_transfer', pay: 'pending',
    timeline: [[0, 'Order placed', 'Customer'], [0, 'Order received — awaiting payment', 'System']] });
  mkOrder({ id: 'PAC-10255', c: 'C-1008', qty: 250, status: 'awaiting_payment', ago: 15 * MIN, method: 'card', pay: 'failed',
    timeline: [[0, 'Order placed', 'Customer'], [0, 'Order received', 'System'], [1, 'Card payment failed at gateway (insufficient funds)', 'Payment Gateway']] });

  const stop = (id: string, seq: number, orderId: string, qty: number, status: Trip['stops'][number]['status'], delivered: number, at: number, reason?: string) => ({
    id, seq, orderId, orderedQty: qty, status, deliveredQty: delivered, completedAt: at, reason,
    pod: delivered > 0 ? { method: 'customer_otp' as const, at } : undefined,
  });
  const trips: Trip[] = [
    {
      id: 'TRP-0101', vehicleId: 'V-01', driverId: 'D-01', allocatedQty: 3700, status: 'completed',
      createdAt: t(3 * DAY + 2 * HOUR), createdBy: 'Kunle Adeyemi', acknowledgedAt: t(3 * DAY + 110 * MIN), startedAt: t(3 * DAY + HOUR),
      completedAt: t(3 * DAY - 90 * MIN),
      stops: [
        stop('ST-1', 1, 'PAC-10231', 1000, 'delivered', 1000, t(3 * DAY + 10 * MIN)),
        stop('ST-2', 2, 'PAC-10232', 1500, 'delivered', 1500, t(3 * DAY - 40 * MIN)),
        stop('ST-3', 3, 'PAC-10233', 1200, 'partial', 1000, t(3 * DAY - 90 * MIN), 'Customer tank capacity reached at 1,000 L'),
      ],
      gps: { pos: DEPOT.pos, updatedAt: t(3 * DAY - 2 * HOUR), state: 'none' },
    },
    {
      id: 'TRP-0102', vehicleId: 'V-01', driverId: 'D-01', allocatedQty: 1500, status: 'completed',
      createdAt: t(DAY + 4 * HOUR), createdBy: 'Kunle Adeyemi', acknowledgedAt: t(DAY + 230 * MIN), startedAt: t(DAY + 3 * HOUR),
      completedAt: t(DAY),
      stops: [
        stop('ST-4', 1, 'PAC-10240', 200, 'delivered', 200, t(DAY + 2 * HOUR)),
        stop('ST-5', 2, 'PAC-10241', 500, 'failed', 0, t(DAY + 60 * MIN), 'Customer unavailable — no response after 3 calls'),
        stop('ST-6', 3, 'PAC-10242', 800, 'delivered', 800, t(DAY)),
      ],
      gps: { pos: DEPOT.pos, updatedAt: t(DAY - HOUR), state: 'none' },
    },
  ];

  const drivers: Driver[] = [
    { id: 'D-01', name: 'Emeka Obi', phone: '+234 805 113 2290', status: 'active', duty: 'available', vehicleId: 'V-01', licenceNo: 'LAG-DL-88213', licenceExpiry: '2027-08-31', joinedAt: t(90 * DAY) },
    { id: 'D-02', name: 'Yusuf Lawal', phone: '+234 812 440 7765', status: 'active', duty: 'available', licenceNo: 'LAG-DL-90442', licenceExpiry: '2026-12-15', joinedAt: t(45 * DAY) },
    { id: 'D-03', name: 'Ibrahim Sani', phone: '+234 816 902 3318', status: 'pending_approval', duty: 'off_duty', licenceNo: 'KAN-DL-11872', licenceExpiry: '2028-03-02', joinedAt: t(2 * DAY) },
  ];

  const vehicles: Vehicle[] = [
    { id: 'V-01', reg: 'LSD 482 XA', type: 'PMS Tanker', capacity: 5000, fuel: 0, status: 'available', driverId: 'D-01', lastInspection: '2026-11-03' },
  ];

  const movements: StockMovement[] = [
    { id: 'MV-1', type: 'receipt', qty: 20000, ref: 'GRN-2201 · Supplier: Lekki Coastal Depot', by: 'Musa Bello', at: t(5 * DAY), note: 'Truck-in, dip-verified' },
    { id: 'MV-2', type: 'load', qty: -3800, ref: 'Depot → LSD 482 XA', by: 'Musa Bello', at: t(3 * DAY + 90 * MIN) },
    { id: 'MV-3', type: 'unload', qty: 300, ref: 'LSD 482 XA → Depot', by: 'Musa Bello', at: t(3 * DAY - 2 * HOUR), note: 'End of day — tank emptied' },
    { id: 'MV-4', type: 'load', qty: -1600, ref: 'Depot → LSD 482 XA', by: 'Musa Bello', at: t(DAY + 210 * MIN) },
    { id: 'MV-5', type: 'unload', qty: 600, ref: 'LSD 482 XA → Depot', by: 'Musa Bello', at: t(DAY - HOUR), note: 'End of day — tank emptied' },
  ];

  const complaints: Complaint[] = [
    { id: 'CMP-301', customerId: 'C-1006', orderId: 'PAC-10233', category: 'Partial delivery', priority: 'high', status: 'under_review', assignedTo: 'Funke Adewale',
      message: 'I paid for 1,200 litres but only 1,000 litres were delivered. What happens to the remaining 200 litres?', createdAt: t(3 * DAY - 3 * HOUR),
      notes: [{ at: t(3 * DAY - 150 * MIN), by: 'Funke Adewale', text: 'Driver reported tank full at 1,000 L. Awaiting management decision: refund or redeliver.', internal: true }] },
    { id: 'CMP-302', customerId: 'C-1007', orderId: 'PAC-10241', category: 'Failed delivery', priority: 'medium', status: 'received',
      message: 'The driver came while I was out. Please reschedule for tomorrow morning.', createdAt: t(DAY - 2 * HOUR), notes: [] },
  ];

  const notifications: AppNotification[] = [
    { id: 'N-1', audience: 'admin', type: 'Payment awaiting verification', message: 'PAC-10252 — transfer evidence submitted (₦305,000)', severity: 'warning', link: '/admin/payments', at: t(39 * MIN), read: false },
    { id: 'N-2', audience: 'admin', type: 'Payment failed', message: 'PAC-10255 — card payment failed at gateway', severity: 'info', link: '/admin/payments', at: t(14 * MIN), read: false },
    { id: 'N-3', audience: 'admin', type: 'Partial delivery unresolved', message: 'PAC-10233 — 200 L outstanding, needs resolution', severity: 'critical', link: '/admin/orders', at: t(3 * DAY - 90 * MIN), read: false },
    { id: 'N-4', audience: 'admin', type: 'Delivery failed', message: 'PAC-10241 — customer unavailable', severity: 'critical', link: '/admin/orders', at: t(DAY + 60 * MIN), read: false },
    { id: 'N-5', audience: 'admin', type: 'New complaint', message: 'CMP-302 from Halima Yusuf — failed delivery', severity: 'warning', link: '/admin/complaints', at: t(DAY - 2 * HOUR), read: true },
    { id: 'N-6', audience: 'customer', recipientId: 'C-1001', type: 'Order completed', message: 'PAC-10240 — 200 L delivered. Thank you for choosing PAC Petrol.', severity: 'success', at: t(DAY + 2 * HOUR), read: true },
    { id: 'N-7', audience: 'driver', recipientId: 'D-01', type: 'Trip completed', message: 'TRP-0102 — all stops done.', severity: 'info', at: t(DAY), read: true },
  ];

  const audit: AuditEntry[] = [
    { id: 'AU-1', at: t(5 * DAY), actor: 'Musa Bello', role: 'Inventory Manager', action: 'Stock receipt recorded', record: 'GRN-2201', before: '0 L', after: '20,000 L' },
    { id: 'AU-2', at: t(4 * DAY), actor: 'Adaeze Okafor', role: 'Super Admin', action: 'Price changed', record: 'PMS unit price', before: '₦980', after: '₦1,000', reason: 'Supplier price review' },
    { id: 'AU-3', at: t(3 * DAY + 2 * HOUR), actor: 'Kunle Adeyemi', role: 'Operations Manager', action: 'Trip created', record: 'TRP-0101', after: '3 stops · 3,700 L' },
    { id: 'AU-4', at: t(DAY + 4 * HOUR), actor: 'Kunle Adeyemi', role: 'Operations Manager', action: 'Trip created', record: 'TRP-0102', after: '3 stops · 1,500 L' },
    { id: 'AU-5', at: t(DAY - HOUR), actor: 'Musa Bello', role: 'Inventory Manager', action: 'Fuel unloaded from truck', record: 'LSD 482 XA', before: '600 L on board', after: '0 L on board' },
    { id: 'AU-6', at: t(2 * HOUR), actor: 'Ngozi Eze', role: 'Finance Officer', action: 'Payment verified', record: 'PAY for PAC-10251', before: 'Verification Pending', after: 'Verified' },
    { id: 'AU-7', at: t(40 * MIN), actor: 'Ngozi Eze', role: 'Finance Officer', action: 'Payment verified', record: 'PAY for PAC-10253', before: 'Verification Pending', after: 'Verified' },
  ];

  const events: SystemEvent[] = [
    { id: 'E-1', at: t(45 * MIN), source: 'Customer App', event: 'order.created', detail: 'PAC-10252 · 300 L · Yaba' },
    { id: 'E-2', at: t(39 * MIN), source: 'Customer App', event: 'payment.evidence_submitted', detail: 'PAC-10252 · transfer receipt uploaded' },
    { id: 'E-3', at: t(25 * MIN), source: 'Customer App', event: 'order.created', detail: 'PAC-10254 · 500 L · Ajah' },
    { id: 'E-4', at: t(14 * MIN), source: 'Payment Gateway', event: 'charge.failed', detail: 'PAC-10255 · insufficient funds' },
  ];

  const settings: Settings = {
    unitPrice: UNIT, deliveryFee: FEE, minOrder: 5, maxOrder: 5000,
    presets: [5, 10, 20, 25, 50, 100, 200, 500, 1000],
    acceptingOrders: true,
    serviceAreas: ['Ikeja GRA', 'Magodo', 'Maryland', 'Gbagada', 'Yaba', 'Surulere', 'Ikoyi', 'Victoria Island', 'Lekki Phase 1', 'Chevron, Lekki', 'Ajah'],
    paymentMethods: { bank_transfer: true, card: true, pay_on_delivery: false },
    requirePaymentBeforeConfirmation: true,
    lowStockThreshold: 3000,
    gpsStaleAfterSec: 45,
    operatingHours: 'Mon–Sat · 07:00–19:00',
    priceHistory: [{ at: t(4 * DAY), by: 'Adaeze Okafor', field: 'unitPrice', from: 980, to: 1000, reason: 'Supplier price review' }],
  };

  // 30 days of aggregated sample history for the Reports module
  let s = 42;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const history: DailyStat[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now - (29 - i) * DAY);
    const orders = 3 + Math.round(rnd() * 6 + i * 0.15);
    const litres = orders * (300 + Math.round(rnd() * 500));
    return {
      day: d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short' }),
      orders, litres, revenue: litres * 1000 + orders * 5000,
      failed: rnd() > 0.8 ? 1 : 0, partial: rnd() > 0.85 ? 1 : 0,
    };
  });

  return {
    version: 1, customers, orders, payments, trips, drivers, vehicles, staff, movements, complaints,
    notifications, audit, events, settings, history, idempotency: {},
    counters: { order: 10255, trip: 102, pay: payN, cmp: 302, mov: 5, seq: 100 },
  };
}
