# SneakDrop System - Architecture & Technical Documentation

## 1. Overview
SneakDrop is a high-concurrency, fault-tolerant reservation and order processing system designed for ultra-high-demand, limited-stock drops (e.g., 20 pairs of sneakers released to thousands of simultaneous buyers).

The system strictly enforces the business rules:
- **Total Stock Limit**: Exactly 20 pairs total. Never oversells even under thousands of concurrent requests.
- **5-Minute Hold**: Clicking **BUY** grants an active reservation for 300 seconds (5 minutes).
- **User Limits**: Maximum 1 active hold at a time; maximum 2 total completed purchases per user.
- **FIFO Waiting Line**: When available stock is 0, users join a strict FIFO queue. When any hold expires or is cancelled, the first person in line automatically receives that pair with a new 5-minute hold.
- **Unreliable Payment Handling**: Idempotent webhook processing, late payment handling (expired holds), duplicate event protection, and out-of-order sequence resolution.
- **Live Reactive Dashboard**: Displays real-time stock, hold countdown (`04:32 remaining`), waiting line position, and an interactive payment simulation tool.

---

## 2. Requirements & Setup

### Requirements
- **Node.js**: `v20.x` or `v22.x` (Recommended: `v22.23.3` or `v20.x`)
- **npm**: `10.x` or higher
- **OS**: Linux, macOS, or Windows
- **Database**: SQLite with WAL (`Write-Ahead Logging`) mode (embedded, zero external DB configuration required).

### Installation
```bash
# Clone or fork the repository
cd sneakdrop-assignment

# Install all workspace dependencies
npm install
```

### Starting the Applications

#### 1. Start Backend API
```bash
npm run dev:api
# Server runs on http://localhost:3001
# Background expiration worker starts automatically
```

#### 2. Start Frontend UI
```bash
npm run dev:web
# Web UI runs on http://localhost:3000
```

#### 3. Run Everything Concurrently
```bash
npm run dev
```

#### 4. Seed / Reset Initial Data
```bash
npm run seed
```

#### 5. Run Unreliable Payment Simulation Script
```bash
npm run simulate:payments
```

---

## 3. Running the Test Suites

The test suite covers Unit, Integration, and Concurrency tests:

```bash
# Run all tests
npm test

# Run specific test suites:
npm run test:unit            # Tests reservation logic, queue logic, payment idempotency
npm run test:integration     # Tests end-to-end purchase flow, hold expiry, queue promotion
npm run test:concurrency     # Tests 100 simultaneous buys & concurrent duplicate payments
```

---

## 4. Architecture & Technical Design

### Project Structure
```text
sneakdrop-assignment/
├── README.md
├── NOTES.md
├── package.json
├── .env.example
├── .gitignore
├── docker-compose.yml
│
├── apps/
│   ├── web/                         # Frontend (Next.js / React)
│   │   ├── src/
│   │   │   ├── app/                 # Pages and global styles
│   │   │   ├── components/          # StockStatus, HoldCountdown, QueuePosition, PaymentStatus, SneakerDrop
│   │   │   ├── lib/api.ts           # API client
│   │   │   └── types/               # Type definitions
│   │   └── package.json
│   │
│   └── api/                         # Backend (Express / TypeScript / SQLite WAL)
│       ├── src/
│       │   ├── server.ts            # Server entrypoint & route registration
│       │   ├── routes/              # inventory, reservations, queue, orders, payments
│       │   ├── services/            # reservation, queue, order, payment, inventory services
│       │   ├── workers/             # reservation-expiry.worker.ts (5-min hold background worker)
│       │   ├── db/                  # client.ts, schema.ts
│       │   ├── middleware/          # error-handler.ts
│       │   └── types/               # Database row interfaces
│       └── package.json
│
├── packages/
│   └── shared/                      # Shared types, interfaces, constants (HOLD_DURATION, MAX_PURCHASES)
│       ├── src/
│       │   ├── types.ts
│       │   ├── constants.ts
│       │   └── index.ts
│       └── package.json
│
├── tests/
│   ├── unit/                        # reservation.test.ts, queue.test.ts, payment.test.ts
│   ├── integration/                 # purchase-flow.test.ts, queue-flow.test.ts, hold-expiry.test.ts
│   └── concurrency/                 # simultaneous-buy.test.ts, duplicate-payment.test.ts
│
└── scripts/
    ├── seed.ts                      # Seeds 20 pairs and test users
    └── simulate-payment.ts          # Simulates late, duplicate, and out-of-order payment events
```

---

## 5. Core Concurrency & Business Logic Solutions

### 1. Preventing Overselling Under High Concurrency
- **Problem**: When 5,000 users click Buy at the exact same millisecond, simple application-level checks (`if (stock > 0)`) cause race conditions and overselling.
- **Solution**:
  1. All reservation and stock operations run inside **atomic SQLite `IMMEDIATE` transactions** in **WAL mode**.
  2. Available stock is calculated dynamically and atomically inside the database transaction:
     $$\text{Available Stock} = \text{Total Stock} - \text{Sold Stock} - \text{Active Non-Expired Holds}$$
  3. Strict database check constraints guarantee `sold_stock <= total_stock` and `purchased_count <= 2`.
  4. Tested with 100 simultaneous concurrent HTTP requests: exactly 5 succeed when 5 pairs remain; all 95 other users are queued in strict FIFO order with zero overselling.

### 2. 5-Minute Hold & Automatic Queue Promotion
- When a user reserves a pair, `reservations` records an `expires_at = datetime('now', '+300 seconds')`.
- A background worker (`ReservationExpiryWorker`) scans for expired holds every 1,000ms.
- When an active hold expires or is cancelled:
  1. The reservation is marked `EXPIRED` or `CANCELLED`.
  2. Any pending order for that reservation is marked `EXPIRED`.
  3. The `QueueService.promoteNext(itemId)` method atomically selects the earliest waiting user (`ORDER BY created_at ASC, id ASC LIMIT 1`) with fewer than 2 purchases.
  4. The selected queue entry is marked `PROMOTED` and given a fresh active 5-minute hold.

### 3. Handling Unreliable Payment Events
The fake payment service handles all real-world webhook edge cases:
- **Idempotency & Duplicate Webhooks**: Webhook payloads contain a unique `eventId`. When a duplicate webhook arrives, the system checks `payment_events` table and returns the existing result immediately without re-processing, double-charging, or decrementing stock twice.
- **Delayed / Late Events**: If a payment event arrives after the user's 5-minute hold has expired and the pair was given to another buyer, the payment processor detects `isExpired` and safely rejects the order with `OrderStatus.EXPIRED` without exceeding total inventory.
- **Out-of-Order Events**: Every event payload carries a `sequenceNumber`. If a later state (e.g., `sequence 2` / `PAID`) was already processed, an older delayed event (e.g., `sequence 1` / `FAILED`) is rejected and cannot revert a completed purchase.

---

## 6. Video Walkthrough Outline (Screen Recording Guide)

When recording your Loom walkthrough video, cover the following structure:

1. **Introduction & What Was Built**:
   - Monorepo architecture (`apps/web`, `apps/api`, `packages/shared`, `tests`, `scripts`).
   - SQLite WAL transaction model for ACID reliability and zero-setup deployment.

2. **Inventory Reservation & Concurrency Guarantees**:
   - Show `reservation.service.ts` transaction block.
   - Explain how available stock is dynamically verified within an atomic lock to guarantee 0 overselling.
   - Demonstrate `tests/concurrency/simultaneous-buy.test.ts` passing (100 simultaneous requests).

3. **5-Minute Hold & Waiting Queue**:
   - Show `HoldCountdown` live timer and `ReservationExpiryWorker`.
   - Show user switching in UI: User 1 holds pair -> User 2 joins queue -> User 1 cancels / expires -> User 2 automatically receives hold.

4. **Unreliable Payment Handling**:
   - Explain `payment.service.ts` idempotency, late event expiration check, and out-of-order sequence check.
   - Run `npm run simulate:payments` live to demonstrate each scenario.

5. **Test Suite Verification**:
   - Run `npm test` in the terminal to show all Unit, Integration, and Concurrency tests passing.
