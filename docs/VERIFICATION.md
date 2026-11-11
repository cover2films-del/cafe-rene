# Verification record — 11 November 2026

Run in the managed Linux workspace using Node 24.22.1 / npm 11.9.0.

| Check                                           | Result                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                             | Passed API/shared/browser and native TypeScript checks                                                  |
| `npm run lint`                                  | Passed ESLint with no reported errors                                                                   |
| `npm test`                                      | 16 tests passed, 0 failed                                                                               |
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
