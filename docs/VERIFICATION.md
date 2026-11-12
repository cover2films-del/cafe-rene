# Verification record — 12 November 2026

Run in the managed Linux workspace using Node 24.22.1 / npm 11.9.0.

| Check                                           | Result                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                             | Passed API/shared/browser and native TypeScript checks                                                  |
| `npm run lint`                                  | Passed ESLint with no reported errors                                                                   |
| `npm test`                                      | 21 tests passed, 0 failed                                                                               |
| `npm run build`                                 | Vite production build passed                                                                            |
| `expo install --check`                          | Dependencies up to date for Expo SDK 54                                                                 |
| `expo export --platform ios --platform android` | Both Metro/Hermes bundles exported, 925/924 modules on the initial full export                          |
| Expo native config introspection                | Passed; camera and foreground location present; microphone/always/background location absent            |
| Real API startup + built static assets          | `/api/health`, `/`, `/staff`, `/atmosphere.svg` all returned HTTP 200                                   |
| External PostgreSQL                             | Not run; portable tests used embedded PostgreSQL/PGlite                                                 |
| Interactive browser QA / screenshots            | Not available; required `cua_repl.js` tool absent. No alternative browser automation installed or used. |
| iPhone/Android device/simulator                 | Not run; no native simulator or connected device                                                        |
| EAS build / signing / installation              | Not run; Expo/Apple account and credentials not supplied                                                |
| Actual payment / POS / booking / notification   | Not connected or tested                                                                                 |
| Publication / Apple submission                  | Not performed                                                                                           |

The initial dependency install hit an unwritable home cache and a React types peer-version mismatch. These were resolved with a workspace-local npm cache and compatible pinned type versions. Expo verification used a workspace-local Expo cache because the default home directory is unavailable here. The successful final checks, not those initial failures, determine the results above.

## Automated coverage

1. Reject client price/discount fields and unknown modifiers; compute authoritative total.
2. Reject tampered, expired and revoked signed table references.
3. Verify payment HMAC and exact amount; repeated provider events create only one job and do not issue early rewards.
4. Failed mock POS delivery enters the recovery queue; retry returns a stable reference without duplicate jobs.
5. Completion issues food points once; refunds reverse eligible rewards and cancel the order.
6. Reject duplicate/expired QR visits; one verified London-day credit.
7. Reject staff refund/manager endpoint access.
8. Require the guest receipt secret; another customer cannot read the receipt.
9. Reject expired or already-used offers.
10. Suppress marketing opt-outs, unmatched interests and disabled channels.
11. Require staff age verification for alcohol and issue no alcohol food points.
12. Refuse live mode.
13. Full HTTP smoke flow: bootstrap, stale-session tolerance, signed table/guest order, mock payment, receipt-secret claim, staff queue/completion, purchase rewards, manager catalogue/refund, refund visit reversal, provenance records, private image upload/re-encoding/access control, data export/deletion and logout.

## Remaining acceptance checks

Use actual devices and browsers before operating the venue: phone/desktop layouts, all keyboard/empty/error states, focus/assistive technology, large text, camera denial, QR expiry, foreground location accuracy/dwell, slow/offline recovery and EAS installation. Validate real provider callback/retry/reconciliation behaviour against vendor sandboxes after provider selection. A successful JavaScript export does not prove native compilation, signing or installation.

## Render/Neon compatibility repair

The PostgreSQL adapter now encodes JSON-array parameters explicitly, covering challenge definitions and immutable modifier snapshots. Seed insertion is transactional and fills missing defaults without overwriting manager edits, so a partial prior setup can recover. A regression test exercises the actual pg adapter with pg wire-value conversion against embedded PostgreSQL. This is not a substitute for connecting to the real Neon project; Render logs and credentials remain unavailable in this workspace.

## Visual/content refresh

Modern Manrope fonts are self-hosted on web and bundled on native. Food photography is locally optimised WebP with credits and illustrative labels. Source-backed November programme entries replace sample listings; original event artwork avoids redistributing unlicensed performer images. New tests cover dated-event filtering and credential-safe, idempotent social import into review. Meta calls are mocked; no real account is connected. TouchOffice/Eposbuddy is recorded as the supplier integration plan, not claimed as a live till connection.

Native image rendering now uses Expo Image for cross-platform WebP support. Final exports include three locally bundled Manrope weights and eleven local images (five food photographs and six original event artworks). Real device and interactive browser checks remain unavailable; successful exports verify bundling, not installation or signing.

## Official branding, automatic refresh and Daniel/circles update

The official logo/programme and website Roboto/Roboto Slab/Bree Serif fonts now replace substitute branding at the user’s request. The website parser was checked against the actual public HTML and its noscript image fallbacks. New tests exercise bounded image discovery, persistent asset bytes, shared refresh leases, last-good recovery, automatic social-post edits/rejection, and the branded cold-start loading state. Private-circle tests cover invitation acceptance, non-member/staff denial, duplicate-message prevention, RSVP permissions, sample points/stamps and deletion without reseeding deleted Daniel data. Memory-test databases now explicitly ignore any configured external DATABASE_URL.

The preview EAS profile points at the actual hosted demo URL. Native exports include four official-site font-family weights and locally bundled official logo/programme fallbacks. No EAS signing, actual iPhone installation or live Meta connection has been performed. Interactive browser screenshots remain unavailable in this environment; server/asset HTTP and React cold-start rendering are checked separately.

A live read of the official public website succeeded using the managed environment’s inherited network proxy: the current programme and logo were decoded and cached into an isolated PostgreSQL-compatible test database with no source errors. No real Neon, EPOS or Meta credentials were used for that check.

## Menu, visuals and EAS Update changes — 12 November

Full suite passed 20 existing tests; the added source-menu test passed after correcting its asset-path assertion. It verifies 96 unique entries, main/Sunday price differences, brunch prices, modifiers, all source dishes’ web/native assets, set-menu course counts, disabled unverified bar items, preservation of manager price edits, and legacy sample copy migration. Final type checking, lint, web production build and both Expo exports are recorded in the latest workspace logs.

The native project now includes expo-updates, its real EAS project URL, preview/production channels and fingerprint runtime compatibility. Launch checks download compatible updates without forced mid-session reload. The GitHub publishing workflow requires the owner’s EXPO_TOKEN secret and EAS environment setup. No cloud update, signed binary, real-device update, rollback, payment or EPOS transaction was performed.

Visual assets and generated sheets were inspected; interactive browser/device checks remain unavailable. Reduced-motion CSS disables decorative movement. Actual EAS Update delivery and first-launch/offline behaviour must be checked on the newly installed binary.

## EAS runtime mismatch follow-up

The first owner-triggered update-enabled iOS cloud build failed in Configure expo-updates. Its provided logs show different fingerprints for config-plugin dependencies and generated native files between the Windows upload and EAS. The runtime is now explicitly `1.0.0-native.1`; the update URL/channel and launch behaviour remain configured. Native compatibility is maintained by incrementing that value alongside native changes, rather than relying on the mismatched fingerprint policy. Actual Expo runtime resolution is checked with managed and generic workflow overrides on both platforms. The owner must retry the signed cloud build; local verification does not prove iOS compilation or installation.

## Startup and rewards visual polish

Added animated startup branding (30% larger logo), a slow blue header glow, native-driven entrance animations and dynamic reduced-motion subscriptions. Artist cards use their artwork behind the entire card including the copy, rather than a solid-colour copy area. All customer tabs have subtle contextual image backgrounds; achievements use food, music/programme or venue images according to their subject.

Fixed native points clipping: the previous 54-point number inherited a 46-point line height. The number now has a dedicated 64/82-point font/line-height pair, scaling for narrow screens, formatted balances and an accessibility label. Browser points tiles now use minimum widths and responsive stacking.

Type checking, lint, the web production build, cold-start rendering test, and both native exports passed. No new native dependencies/configuration were added; runtime remains `1.0.0-native.1`. Motion and layout have not been verified interactively on an actual phone or browser in this workspace.

## My René discovery

Added an authenticated member discovery endpoint and web/native taste selectors, favourites and explained recommendations. Seeded curation is isolated from orders and financial reports, with internal provenance and no invented sales counts. Regression coverage checks unauthenticated rejection, session identity despite a different query-string ID, personalisation opt-out without a history query, saved taste matching, vegan/alcohol-free filtering, disabled-item exclusion, unpriced/non-orderable drinks, old-client preference preservation, invalid taste rejection, no repeated consent reset, and no fabricated order rows.

Type checking, lint, web build and iOS/Android exports passed. The new regression and existing tests are recorded in the latest discovery verification logs. Real-device/network-interruption testing and live EPOS drink/menu synchronisation remain unperformed.

## Final customer visual system

Refined the home hero around actual venue photography and added four full-image action cards that navigate to the existing order, programme, rewards and member screens. Customer controls now share cream/ink/aqua/pink colours, rounded shapes, clearer active/focus states and image-card spacing. Wide-screen navigation stays available while scrolling; mobile web retains the bottom navigation without a large sticky header consuming the viewport.

Native navigation/basket now use vector icons drawn with the already-installed SVG library, larger labels and active capsules. Native home cards navigate through the existing tab state; button presses give restrained feedback. No new native dependency, permission or runtime version is introduced. Reduced-motion users retain static imagery and readable controls.

API/shared/native type checks, lint, web production build and branded cold-start test passed. iOS/Android exports are checked separately. Interactive visual QA and real-device tap/keyboard checks still need to be performed on the installed build; no screenshot-based verification is claimed.
