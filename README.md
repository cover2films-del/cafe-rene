# Café René Gloucester

A local, end-to-end **demonstration**, with a native Expo iPhone/Android app, mobile browser ordering, responsive staff/manager workspace and a shared TypeScript API. Nothing has been published, charged, submitted to Apple or connected to a real POS.

## Quick start

Requires Node 24 LTS and npm. From this directory:

```sh
npm ci
npm run dev
```

- Customer browser: http://localhost:5173
- Staff workspace: http://localhost:5173/staff
- API health: http://localhost:3001/api/health
- PostgreSQL-compatible demo data persists at `work/database/`. No database server is needed.
- Stop the API before deleting `work/database/` to reset the demo. Do not delete it while running.

All seeded accounts are explicitly fictional demo accounts:

| Role          | Email              | Password      |
| ------------- | ------------------ | ------------- |
| Customer      | customer@demo.rene | ReneDemo2026! |
| Staff         | staff@demo.rene    | ReneDemo2026! |
| Manager       | manager@demo.rene  | ReneDemo2026! |
| Administrator | admin@demo.rene    | ReneDemo2026! |

For signatures that survive API restarts, copy `.env.example` to `.env` and set two distinct random secrets. Do not commit this file. Without them, temporary process secrets are generated and previously issued QR references expire on restart. The API loads the root `.env` automatically when started using its npm workspace command.

## Try the complete flow

1. Browse as a guest, or sign in as the seeded customer for purchase rewards.
2. Order → choose Table 2 (or scan a staff-generated table QR) → add a burger and modifier → basket → create demo order.
3. The API computes the total. Press **Simulate payment**. A signed mock provider event changes payment to paid; the order remains awaiting acceptance.
4. Open `/staff` in a second browser, sign in as staff/manager. Queue updates automatically. Review the order, accept, prepare, mark ready, then complete. Alcohol requires an explicit in-person age check before acceptance.
5. View the receipt and eligible food points. Completed purchases also verify a visit; the unique London-day constraint prevents duplicate credit.
6. Staff → Tables & check-in → rotating QR. Scan it in the native app, or paste the reference into browser Rewards. Visit credit remains one per London day.
7. Manager → Customers & challenges: find the customer and verify a quiz, performance or clue. Repeated references cannot duplicate credit. Configure target counts in Events & rewards.
8. Manager → Integrations → fail next POS delivery. Place/pay another order, observe the paid-but-unsent alert, then retry or refund. Automatic retries use backoff and stop after five attempts; a manager can reset/retry.
9. Manager → Overview → mock refund. Payment and fulfilment change independently; issued points are reversed. Redemptions remain consumed/reversed to prevent reuse.
10. My René → opt into personalisation and email, select an interest. Manager → Campaigns → set audience, budget, recipient limit and a 9am–9pm London schedule → approve → preview → schedule demo. **No messages are sent.**

## Native app / Expo

```sh
cp apps/mobile/.env.example apps/mobile/.env
# Set EXPO_PUBLIC_API_URL and EXPO_PUBLIC_WEB_URL to reachable addresses.
# For local Expo Go these can be your laptop's LAN IP; an iPhone cannot use your laptop's localhost.
npm run mobile
```

Use Expo Go compatible with SDK 54, or an EAS development build. The native app uses React Native components, SecureStore sessions/receipt secrets, a camera QR scanner, deep links, and foreground-only location assistance. It is not a web view wrapper. A manager must set verified venue coordinates before proximity assistance can run; no coordinates were invented. Location requires account opt-in plus OS permission. The dwell check is continuous while the Rewards screen stays open and stops when the app backgrounds or the screen is left. No location is uploaded or retained.

See [EAS and Apple setup](docs/EAS.md) for exact build, device registration and submission commands. EAS builds and device installation have **not** been executed in this environment.

## Commands

```sh
npm run typecheck
npm run lint
npm test
npm run build
# Metro/Hermes JavaScript bundle verification, not an Apple or Android binary build:
cd apps/mobile
npx expo install --check
npx expo export --platform ios --platform android --output-dir ../../work/native-export
```

Browser builds go to `apps/web/dist/`. The API must run for checkout. Native bundles do not include the server. Use a reachable HTTPS API for installed builds; do not enable arbitrary iOS transport security exceptions.

## Architecture

- `apps/mobile`: Expo SDK 54 / React Native; five customer tabs, native scanner and arrival assistance.
- `apps/web`: React + Vite, selected because this app needs no SSR; `/` customer ordering and `/staff` role-protected operational views. The API is shared with native.
- `apps/api`: Express 5, Zod validation, PostgreSQL SQL, PGlite persistence for the portable local demo. Set `DATABASE_URL` for hosted PostgreSQL using the same schema. See [architecture and integration notes](docs/ARCHITECTURE.md).
- `packages/shared`: shared menu/basket/status types, money formatting, London calendar-day helper and example challenge definitions.
- `docs/content-sources.json`: source URLs, retrieval date, imported fields, confidence, missing permissions and review status.

`APP_MODE=live` intentionally refuses to start. Implement and separately approve real adapters before enabling live service. Demo providers contain no live endpoint URLs. Shared database rules and price snapshots keep future payment/POS changes out of the customer experience.

## Content and limitations

Contact details and menu references come from the official website and 2026-named PDF; **prices, allergens, hours and reuse permissions need venue approval**. All allergens are unknown rather than inferred. At the venue user’s request, the apps now use the official logo and programme graphics, Roboto body text, Roboto Slab headlines and Bree Serif navigation, alongside licensed illustrative food photographs; sources are recorded in docs/image-credits.json. Food photographs do not represent actual venue dishes.

Facebook (including the URL supplied in chat) required login/returned a block; Instagram was throttled. No posts or customer comments were copied. The Instagram handle is now corroborated by the official November poster; direct post access remains restricted. Content review accepts pasted text/CSV, image URL references and PNG/JPEG/WebP uploads under 800 KB. Uploaded images are decoded, resized, stripped of metadata and stored as private WebP assets with provenance. Approved venue website artwork refreshes automatically; authenticated social accounts can automatically publish venue posts. Structured event dates still require review. A local object-store adapter is implemented; a production bucket adapter is still required.

Upcoming events now come from the official November 2026 programme, checked 11 November. Past events are filtered automatically, and verified listings take precedence over samples. Offers remain labelled demo content. See docs/SOCIAL-CONTENT.md for the optional authorised Meta refresh workflow. Reservations are local demo requests; tickets are single-use mock records. Event reminders and marketing preferences are stored; notification delivery is not connected. Campaign scheduling is a preview/simulation, not an actual send queue. Campaign attribution metrics remain zero demonstration values.

The demo includes configurable challenge targets and server-derived progress, not a full historical achievements/expiry engine. Performance, quiz, festival and clue validation relies on staff; it is not integrated with an external ticketing system. Offers have expiry and single-use constraints. Guest order claims require the original device/browser receipt secret; retroactive rewards for an already completed guest purchase are not issued. Location does not award points or unlock offers. Always-on background arrival, bar tabs and split payments remain disabled.

The API role checks and tested constraints are real; the seeded shared passwords and mock payment route are strictly for a private demo. A production release needs managed authentication/password recovery, staff onboarding and MFA, external rate-limit storage, provider selection, backups, monitoring, formal privacy/retention review and an independent security assessment.

See [verification results](docs/VERIFICATION.md) and [release decisions](docs/RELEASE-CHECKLIST.md). No screenshots or interactive browser/device smoke test were produced because the required browser-control tool and native simulators were unavailable. Automated HTTP smoke tests exercise the end-to-end server flow.

The venue has identified its EPOS as TouchOffice supplied by Eposbuddy. The integration plan appears under staff Integrations; order delivery remains mock pending supplier-approved API access. See docs/TOUCHOFFICE-EPOSBUDDY.md.

## Daniel Woolf, René Points and private circles

The demo includes `daniel@demo.rene`, password `ReneDemo2026!`. My René has an **Explore Daniel’s demo** button. Daniel’s provided name is attached to explicitly fictional/sample purchases, not actual consumption records. It shows three sample visits, food/drink receipts, 100 René Points (51 food points +49 demo welcome points), three of six Kitchen Club food-day stamps, eligible offers and completed badges. Alcohol/soft drinks do not earn food points or stamps. Six stamps unlock a server-validated £5 food promotion; refunds remove eligibility through the underlying paid-order conditions.

Demo Alex (`demo-alex@demo.rene`) and Demo Sam (`demo-sam@demo.rene`) are explicitly fictional members using the same demo password. The seeded private Friday group contains example messages and a sample plan; no table or tickets are booked. Private groups, direct invitations, acceptance/decline, messages, plans and RSVP actions persist in PostgreSQL. Membership is checked server-side on every conversation action. Staff do not get a bypass. New members must opt into display-name discovery. Messages are stored server-side (not end-to-end encrypted), limited/rate-limited and idempotent; no push/email/SMS delivery is connected. Account export includes own messages; deletion removes membership, removes authored plans and anonymises shared messages.

Official website content is checked on startup and every 15 minutes while the API is awake. Last-good assets are stored as PostgreSQL bytea, so they survive Render Free redeploys. Clients refresh public content while active. Render Free can sleep; this is not an always-on scheduler. Meta credentials are still required for real Facebook/Instagram pulls. See docs/SOCIAL-CONTENT.md for the current policy.
