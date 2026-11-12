// Domain model for the PAC Petrol platform demo.
// Mirrors the entities a real backend would hold (see /architecture in the app).
// Order, payment, trip and stop statuses are deliberately SEPARATE fields — spec §4.5 / §11.3.

export type Role = 'super_admin' | 'operations' | 'finance' | 'inventory' | 'support';

export interface StaffUser {
  id: string;
  name: string;
  role: Role;
  email: string;
}

export type OrderStatus =
  | 'received' // Order Received – awaiting payment / review
  | 'awaiting_payment'
  | 'payment_verification'
  | 'awaiting_confirmation' // payment OK, operational checks pending
  | 'confirmed'
  | 'assigned' // on a trip, not yet departed
  | 'out_for_delivery'
  | 'delivered'
  | 'partially_delivered'
  | 'delivery_failed'
  | 'completed'
  | 'cancelled';

export type PaymentStatus =
  | 'not_initiated'
  | 'pending'
  | 'evidence_submitted'
  | 'verification_pending'
  | 'verified'
  | 'failed'
  | 'rejected'
  | 'refund_pending'
  | 'refunded';

export type PaymentMethod = 'bank_transfer' | 'card';

// Simplified trip lifecycle: admin assigns → driver accepts → driver starts → every stop resolved → completed (automatic).
export type TripStatus =
  | 'assigned' // waiting for the driver to accept
  | 'acknowledged' // accepted, not yet started
  | 'in_transit'
  | 'completed'
  | 'cancelled';

export type StopStatus = 'pending' | 'delivered' | 'partial' | 'failed';

export type GpsState = 'live' | 'stale' | 'offline' | 'permission_denied' | 'none';

export interface Point {
  x: number;
  y: number;
}

export interface Address {
  id: string;
  label: string; // Home, Office…
  kind: 'home' | 'office' | 'business' | 'other';
  line: string;
  area: string;
  landmark?: string;
  instructions?: string;
  pos: Point; // position on the demo Lagos map
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  category: 'household' | 'business';
  status: 'active' | 'suspended';
  verified: boolean;
  registeredAt: number;
  addresses: Address[];
}

export interface TimelineEvent {
  at: number;
  label: string;
  by: string;
  note?: string;
}

export interface Order {
  id: string;
  customerId: string;
  product: 'PMS';
  qty: number;
  unitPrice: number;
  deliveryFee: number;
  total: number;
  address: Address; // snapshot — editing a saved address never changes a confirmed order (spec §6.4)
  paymentMethod: PaymentMethod;
  paymentId: string;
  status: OrderStatus;
  tripId?: string;
  deliveredQty?: number;
  deliveryOtp: string;
  createdAt: number;
  timeline: TimelineEvent[];
  cancelReason?: string;
  outcomeReason?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  amountDue: number;
  amountSubmitted?: number;
  method: PaymentMethod;
  reference: string;
  status: PaymentStatus;
  evidence?: string;
  verifiedBy?: string;
  verifiedAt?: number;
  rejectReason?: string;
  createdAt: number;
  refund?: { amount: number; reason: string; status: 'pending' | 'completed'; by: string; at: number };
}

export interface Stop {
  id: string;
  seq: number;
  orderId: string;
  orderedQty: number;
  status: StopStatus;
  completedAt?: number;
  deliveredQty?: number;
  reason?: string;
  pod?: { method: 'customer_otp'; at: number };
}

export interface Trip {
  id: string;
  vehicleId: string;
  driverId: string;
  allocatedQty: number; // sum of the orders on this trip — must fit in the fuel on the truck
  stops: Stop[];
  status: TripStatus;
  createdAt: number;
  createdBy: string;
  acknowledgedAt?: number;
  startedAt?: number;
  completedAt?: number;
  gps: { pos: Point; updatedAt: number; state: GpsState };
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: 'pending_approval' | 'active' | 'suspended' | 'deactivated';
  duty: 'off_duty' | 'available' | 'on_trip';
  vehicleId?: string;
  licenceNo: string;
  licenceExpiry: string;
  joinedAt: number;
  removed?: boolean; // soft-deleted: hidden from operations, kept for trip history & audit
}

export interface Vehicle {
  id: string;
  reg: string;
  type: string;
  capacity: number;
  fuel: number; // litres currently in the tank — loaded from the depot on the Inventory page, reduced by each delivery
  status: 'available' | 'assigned' | 'on_trip' | 'maintenance' | 'unavailable' | 'suspended';
  driverId?: string;
  lastInspection: string;
  removed?: boolean; // soft-deleted: hidden from operations, kept for trip history & audit
}

// receipt = supplier → depot · load = depot → truck · unload = truck → depot
export type MovementType = 'receipt' | 'load' | 'unload';

export interface StockMovement {
  id: string;
  type: MovementType;
  qty: number; // signed effect on depot stock
  ref: string;
  by: string;
  at: number;
  note?: string;
}

export interface Complaint {
  id: string;
  customerId: string;
  orderId?: string;
  category: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  status: 'submitted' | 'received' | 'under_review' | 'awaiting_customer' | 'resolved' | 'closed';
  assignedTo?: string;
  createdAt: number;
  notes: { at: number; by: string; text: string; internal: boolean }[];
}

export type Audience = 'admin' | 'customer' | 'driver';

export interface AppNotification {
  id: string;
  audience: Audience;
  recipientId?: string; // customerId / driverId
  type: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'critical';
  link?: string;
  at: number;
  read: boolean;
}

export interface AuditEntry {
  id: string;
  at: number;
  actor: string;
  role: string;
  action: string;
  record: string;
  before?: string;
  after?: string;
  reason?: string;
  denied?: boolean;
}

export interface SystemEvent {
  id: string;
  at: number;
  source: 'Customer App' | 'Driver App' | 'Admin Dashboard' | 'Backend' | 'Payment Gateway' | 'GPS';
  event: string;
  detail: string;
}

export interface PriceChange {
  at: number;
  by: string;
  field: 'unitPrice' | 'deliveryFee';
  from: number;
  to: number;
  reason: string;
}

export interface Settings {
  unitPrice: number;
  deliveryFee: number;
  minOrder: number;
  maxOrder: number;
  presets: number[];
  acceptingOrders: boolean;
  serviceAreas: string[];
  paymentMethods: { bank_transfer: boolean; card: boolean; pay_on_delivery: boolean };
  requirePaymentBeforeConfirmation: boolean;
  lowStockThreshold: number;
  gpsStaleAfterSec: number;
  operatingHours: string;
  priceHistory: PriceChange[];
}

export interface Result {
  ok: boolean;
  error?: string;
  id?: string;
}
