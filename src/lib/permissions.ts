import type { Role } from './types';

// Action-level permissions (spec §16.8). The store checks these on every admin action —
// hiding a button is never the only control.
export type Permission =
  | 'orders.view' | 'orders.confirm' | 'orders.cancel' | 'orders.resolve'
  | 'payments.view' | 'payments.verify' | 'payments.refund'
  | 'dispatch.view' | 'dispatch.create' | 'tracking.view'
  | 'inventory.view' | 'inventory.receive' | 'inventory.load'
  | 'customers.view' | 'customers.suspend'
  | 'drivers.view' | 'drivers.manage' | 'vehicles.view' | 'vehicles.manage'
  | 'complaints.view' | 'complaints.manage'
  | 'reports.view' | 'reports.export'
  | 'audit.view' | 'settings.view' | 'settings.manage' | 'pricing.manage';

const ALL: Permission[] = [
  'orders.view', 'orders.confirm', 'orders.cancel', 'orders.resolve', 'payments.view', 'payments.verify', 'payments.refund',
  'dispatch.view', 'dispatch.create', 'tracking.view', 'inventory.view', 'inventory.receive',
  'inventory.load', 'customers.view', 'customers.suspend', 'drivers.view', 'drivers.manage',
  'vehicles.view', 'vehicles.manage', 'complaints.view', 'complaints.manage', 'reports.view', 'reports.export', 'audit.view',
  'settings.view', 'settings.manage', 'pricing.manage',
];

export const rolePermissions: Record<Role, Permission[]> = {
  super_admin: ALL,
  operations: [
    'orders.view', 'orders.confirm', 'orders.cancel', 'orders.resolve', 'payments.view',
    'dispatch.view', 'dispatch.create', 'tracking.view', 'inventory.view', 'inventory.load',
    'customers.view', 'drivers.view', 'drivers.manage', 'vehicles.view', 'vehicles.manage',
    'complaints.view', 'reports.view', 'reports.export',
  ],
  finance: ['orders.view', 'payments.view', 'payments.verify', 'payments.refund', 'customers.view', 'reports.view', 'reports.export'],
  inventory: ['inventory.view', 'inventory.receive', 'inventory.load', 'dispatch.view', 'vehicles.view', 'tracking.view', 'reports.view'],
  support: ['orders.view', 'customers.view', 'complaints.view', 'complaints.manage', 'tracking.view'],
};

export const can = (role: Role, p: Permission) => rolePermissions[role].includes(p);
