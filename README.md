# PAC Petrol — Platform Demo

An interactive web demo of the PAC Petrol platform (Customer App, Driver App and Admin Dashboard on one shared backend), built from the client's requirement documents. It explains how the system works and demonstrates it working.

## Run it

```bash
npm install
npm run dev        # http://localhost:5180
npm run build      # production build in dist/ (deploy to Vercel/Netlify as a static SPA)
```

Data is simulated in the browser (localStorage). Use **Reset** in the admin banner or the demo console to restore the starting state. Open the Admin Dashboard in a second window and it stays in sync with the phones in real time.

## What's inside

| Route | What it is |
|---|---|
| `/` | Overview: the three apps, the non-negotiable rules, launch baseline |
| `/how-it-works` | The 8-stage journey (set up fleet → load fuel → order → confirm → assign driver → accept/start → deliver with code → trip auto-completes) |
| `/architecture` | System diagram, recommended stack, data model, realtime flow, security, offline mode |
| `/integrations` | Payments, bank-transfer verification, Google Maps/Routes, GPS, FCM, SMS OTP, email, storage, monitoring |
| `/rules` | Backend-enforced rules, the role/permission matrix, management decisions pending |
| `/design` | Executive Evergreen palette, tokens, typography, status colours, logo usage |
| `/delivery` | Phases, deliverables, FRS acceptance tests (linked to the demo) |
| `/demo` | **Live demo console**: Customer + Driver phones, backend event stream, guided 10-step scenario |
| `/customer`, `/driver` | Each mobile app full-screen in a device frame |
| `/admin/*` | Admin Dashboard: all 14 modules from the spec |

## The flow in one line

**Drivers** (add, give a truck) → **Vehicles** (add trucks) → **Fuel & Inventory** (load fuel into the truck) → **Orders**: 1 confirm, 2 assign a driver (their truck goes with them) → **Driver App**: Accept → Start trip → Deliver with the customer’s code → trip finishes by itself.

## Suggested client walkthrough (≈8 minutes)

1. **Overview** → the three apps. **How It Works** → click through the 8 stages.
2. **Live Demo** → open the Admin Dashboard in a second window beside it. Each step below also has a **Do it** button.
3. Customer App: order 300 L, pay by bank transfer, upload the receipt.
4. Admin → **Orders** → open the order → **Payment received — confirm order** (one click checks the payment and confirms).
5. Admin → **Fuel & Inventory** → LSD 482 XA → **Fill up** → **Load into truck** (the truck starts empty).
6. Admin → **Orders** → open the order → pick **Emeka Obi** (truck LSD 482 XA) → **Assign driver**. Assign PAC-10250 and PAC-10251 to Emeka too: they become extra stops on the same trip.
7. Driver App: **Accept delivery** → **Start trip** (the truck appears on Live Tracking).
8. Driver App: **Go to stop** → litres → the customer’s 4-digit code (shown in the Customer App) → **Confirm delivery**. Repeat. After the last stop the trip finishes on its own.
9. Back in **Fuel & Inventory**: the delivered litres have come off the truck. Leftover fuel can stay for the next trip or be unloaded.
10. Fleet management: **Drivers** → Add driver / give a truck / Suspend / Delete; **Vehicles** → Add truck / Maintenance / Suspend / Delete. Anything with past trips is archived, not erased.

What the system blocks (try it): assigning before confirming, assigning a driver with no truck, a truck without enough fuel, overfilling a truck, deleting a truck with fuel on board, changing a driver or truck that has deliveries in progress.

## Code map

- `src/lib/store.ts`: the simulated central backend. Every business rule, RBAC check, audit entry, event and notification lives here (in production this is the NestJS API).
- `src/lib/permissions.ts`: action-level role permissions.
- `src/lib/seed.ts`: starting data (illustrative prices: ₦1,000/L, ₦5,000 delivery fee).
- `src/customer/`, `src/driver/`, `src/admin/`: the three apps.
- `src/pages/explainer/`: the explanation site.
- `tailwind.config.js`: brand design tokens (official brand spec palette).

## Notes for the client

- Prices, limits, service areas, payment policy, POD method and tolerances are **placeholders pending management decision** (see `/rules`).
- The Admin spec and the Brand spec give different palettes. The demo follows the official **Brand specification** (see `/design`).
- Maps are schematic. Production uses Google Maps Platform.
