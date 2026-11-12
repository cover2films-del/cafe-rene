# Architecture and provider contracts

## Runtime choices

Expo/React Native implements the installed app. React/Vite implements a client-rendered ordering app and responsive dashboard; SSR is unnecessary for this private demo, so Next.js was not added. Both clients call the same Express API. Prices, modifiers, table validation, payment state, staff permissions, rewards, offers and eligibility are enforced there.

SQL is PostgreSQL throughout. The demo uses `@electric-sql/pglite`, an embedded PostgreSQL runtime backed by a local directory; it is not a separate network PostgreSQL server. The `DB` adapter uses `pg` when DATABASE_URL is set. The schema is in `apps/api/src/schema.sql`, executed on startup with CREATE TABLE IF NOT EXISTS. PostgreSQL deployment has not been tested against an external server. Before production, replace startup schema bootstrapping with versioned migrations, backups and restore drills.

Critical actions use transactions, row locks where relevant, check constraints and unique keys. Foreign keys cover ownership/references. Prices are integer GBP pence; order-item names, unit prices and modifiers are immutable purchase snapshots. Payment and fulfilment are separate columns. A paid order is not accepted until staff progression. A receipt can show payment confirmation while still waiting for acceptance.

## Data and access

Tables cover users/roles, hashed sessions, consent versions, menu, settings/challenge definitions, tables, orders/items, payments/provider events, jobs/POS attempts, loyalty ledger/redemptions, visits/staff validations, events/favourites, bookings/tickets, campaigns/delivery history, provenance and audit records. Challenge progress is derived from verified activity; this demo does not persist a separate historical achievements entity.

Web sessions use HttpOnly, SameSite=Strict cookies. Set COOKIE_SECURE=true behind HTTPS. Mobile bearer tokens and guest receipt references use Expo SecureStore; the native bundle has no server/provider secret. Passwords use per-user scrypt salts. Session tokens are random and stored only as SHA-256 digests. Guest order access requires a separate 256-bit receipt secret; knowing the order UUID is insufficient. Linking requires both an authenticated customer and that secret. Guest receipts in the browser use sessionStorage and are lost when that tab/session is cleared; they contain no payment credentials.

Backend roles protect operations independently of navigation. Staff see the active queue and name/ID lookup; manager screens include reconciliation and controlled adjustments. Staff do not receive a full customer purchase/marketing history via lookup. Authentication and ordering have per-process rate limits; a distributed deployment needs a shared limiter store. Web CORS is an exact allowlist, not '*'. No raw card details are collected anywhere.

## Payment/POS sequence

1. Validate basket, modifiers, hours/availability, signed table reference and offer eligibility.
2. Create an unpaid order and its immutable lines, reserve any single-use offer, and create a mock provider session inside the transaction.
3. The customer explicitly simulates payment. This invokes the mock provider's signed event processing. No client redirect is treated as proof of payment.
4. Verify the raw request HMAC, event schema and exact amount. Unique event IDs prevent replay side effects; already-confirmed orders do not re-enqueue.
5. Atomically set payment=paid and fulfilment=awaiting_acceptance, and insert the unique order delivery job.
6. The in-process job loop claims pending/failed work, records an attempt, and submits using the order ID as an idempotency key. Failure leaves a visible paid-but-unsent alert. Retry backoff is capped; five failed attempts require manager intervention.
7. The mock POS returns a stable reference and **accepted=false**. Staff must accept, prepare, mark ready and complete; staff acceptance requires POS delivery, and alcohol requires an explicit in-person age check.
8. Completion credits eligible food points once and a unique London-day visit. Alcohol/soft drinks do not earn food points or Menu Explorer progress. Refund reverses net order-linked ledger points, cancels delivery/fulfilment, and removes a visit whose only stored verification is that refunded purchase. A day with multiple purchases may need staff re-verification after reversal; the demo does not rebuild alternate purchase evidence automatically.

`PaymentAdapter` and `POSAdapter` are in `apps/api/src/adapters.ts`. A real payment adapter must add provider-hosted/native components, session metadata, verified provider webhook parsing, idempotent refund requests and reconciliation of interrupted requests. In a real distributed system, do not hold SQL transactions over provider network calls; add a durable provider outbox and recovery state. The current mock calls are local and deterministic. Extend refunds with partial-refund/item allocations before offering partial refunds.

A real POS adapter must support idempotent submit, explicit venue acceptance/rejection, order status callbacks, item mapping, failure reconciliation and cancellation/refund policy. Confirm the venue's existing POS vendor/API before selecting a connector. There is no fabricated vendor connection. Platform wallets require a real provider, merchant setup and native entitlements. Bar payment and split tabs have no enabled client actions.

APP_MODE=live fails at Service construction. No demo adapter has a configured live HTTP endpoint. Keep future live datasets/secrets in a separate deployment/database, do not repurpose the seeded demonstration accounts.

## Jobs and deployment

`npm run dev` runs the API and browser locally. The API automatically processes mock jobs every three seconds. With PostgreSQL, an external worker can run the same transactional claim loop using `npm run worker`; it requires the same session/webhook secrets. **Do not open the same PGlite directory from two processes.** For this reason the embedded demo uses only its in-process worker.

For an ordinary Node host, build and serve the web app from the API:

```sh
npm ci
npm run build
SERVE_WEB=true COOKIE_SECURE=true npm run dev -w @rene/api
```

The last command uses a development watch process for convenience. For a persistent deployment use a process manager with `node --import tsx apps/api/src/server.ts` **from apps/api as working directory**, or compile the API using your deployment tooling. More precisely, from the repository root use:

```sh
cd apps/api
SERVE_WEB=true COOKIE_SECURE=true node --import tsx src/server.ts
```

Route HTTPS to port 3001; set DATABASE_URL, SESSION_SECRET, MOCK_WEBHOOK_SECRET, CORS_ORIGINS and APP_MODE=demo. An alternative host can serve `apps/web/dist/` and reverse-proxy `/api` to the API. Both browser and staff routes need index.html fallback. The native app needs EXPO_PUBLIC_API_URL pointing to that host. No cloud host, database, bucket, domain or secrets were provisioned here.

Media uploads use an `ObjectStore` interface with a local filesystem adapter in `apps/api/src/media.ts`. Managers upload PNG/JPEG/WebP files under 800 KB; Sharp decodes with a 20-megapixel limit, rotates, resizes within 1400×1400, strips metadata and re-encodes WebP. The result is stored under `work/media/` (or MEDIA_DIR), with private manager-only preview access, source URL, permission flag and audit record. Unknown permission stays visible in review; upload/review never publishes it to the customer app. For a real deployment, replace LocalMedia with an authorised S3/R2 bucket adapter and durable media lifecycle. Text/CSV/image references are stored without fetching untrusted URLs. No external venue photography is hotlinked and no social feeds are embedded.

## Location, rewards and campaigns

Schedules, quiet hours and visit dates use Europe/London. Proximity assistance requires account opt-in, foreground permission, manager-configured coordinates, acceptable accuracy and dwell time. Native location samples stay in memory and are discarded after each check; precise-location server retention is zero because the API does not receive it. QR or staff verification is required for arrival credit. No public attendance roster exists.

Seven example challenges have server-derived progress. Staff can validate external attendance/clues, managers can change targets and reverse evidence. References have per-user/kind uniqueness. The example history hunt requires staff confirmation of clue references; a separate rotating clue-code engine and challenge expiry/history are not implemented. Offers have explicit expiry, points threshold, minimum food spend and a single-use reservation/redemption record. Refunded offers remain consumed. No reward is based on alcohol quantity, speed or spending.

Campaigns require personalisation AND channel consent and may filter explicit interests. The stored delivery ledger supports a rolling seven-day frequency cap; no deliveries are inserted in demo mode. Launch rejects schedules outside 09:00–21:00 London and expired offers, applies recipient/budget limits, and requires recorded human approval. It changes status to demo_scheduled and sends zero messages. No scheduler/notification provider is connected. Opt-outs are read at preview/launch time. Before real sends, re-evaluate every recipient at delivery time, implement unsubscribe links, durable suppression, scheduling/retries, budget reservations and reporting/control groups. Attributed sales must not be presented as proven incremental revenue.

## Current content cache and private circles

Automatic official website/social assets use the new venue_assets PostgreSQL bytea table with checksums, ETags and cache-busting URLs. A shared lease in settings prevents concurrent refreshes; source reads are bounded and allowlisted, old successful content remains after an error, and Render Free sleep is respected. See SOCIAL-CONTENT.md for scheduler/publication policy. The original manager upload adapter is still local filesystem storage and is separate from this durable automatic cache.

Private messaging uses social_profiles (opt-in name discovery), circles, circle_members, circle_messages, circle_plans and circle_rsvps. Every conversation read/write checks active membership; higher staff roles do not bypass it. Per-message client UUIDs prevent duplicates. Shared messages are not end-to-end encrypted; no external notification provider is connected. See DANIEL-AND-CIRCLES.md for the demo data, consent and deletion behaviour. Food stamps count distinct Europe/London dates of completed, paid food orders and are rechecked during promotion redemption.
