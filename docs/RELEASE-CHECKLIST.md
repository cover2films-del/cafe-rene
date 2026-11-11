# Decisions still needed

This is a local demonstration, not an operational service. No publishing is authorised by the brief and none was performed.

## Before an iPhone preview

- Your Expo account and EAS project ID.
- Paid Apple Developer membership, Apple team and ad hoc-registered iPhone UDID.
- Permanent bundle/package IDs and authorised app branding.
- A reachable HTTPS demonstration API/web deployment, with persistence and demo-only secrets.
- EAS environment API/web URLs. Do not put secrets into EXPO_PUBLIC variables.
- Real-device testing: QR scanner, camera denial, location denial/unavailable, safe areas, keyboard, connectivity loss, dynamic text, VoiceOver/TalkBack and reduced motion.

## Venue content review

- Confirm home/restaurant opening hours and Sunday ordering rules. The brief reports conflicts; the current retrieved text agreed, so the app flags uncertainty instead of inventing a conflict. The 24-hour licence is not used as an opening schedule.
- Approve prices from MainMenu26.pdf; provide a current allergen matrix and item/modifier availability.
- Confirm current official social ownership (Instagram remains unverified), upcoming performance dates, ticket policies and festival programme.
- Authorise reuse of the actual logo and photography. Supply original assets/permissions. The illustration is not a venue photograph.
- Review pasted/imported content and associated provenance before making it public.

## Before operational release

- Select the real payment provider, merchant account, webhooks, signing keys, refunds and wallet entitlements.
- Identify existing POS vendor/API, sandbox access, menu mappings, acceptance/status callbacks and cancellation rules.
- Use separate live/demo databases and credentials; remove seeded demo accounts and mock endpoints from any live deployment.
- Implement real provider adapters, distributed outbox/reconciliation, partial refunds and provider failure runbooks. APP_MODE=live currently fails closed.
- Deploy managed PostgreSQL with versioned migrations, backups, restore tests, logging/metrics and alert routing.
- Replace demo auth with production identity/password recovery, staff account lifecycle/MFA and shared rate limits.
- Define approved loyalty economics, challenge expiry/history and rotating clue-code policies.
- Choose booking/ticket integrations, notification/email provider and object storage. Current campaigns/tickets/bookings are demo records only.
- Add durable campaign scheduling/delivery suppression, frequency/budget reservations, human release review and actual measurement. Do not treat attributed sales as proven incremental sales.
- Review UK privacy/marketing notices and retention with the venue. Data export/deletion paths are implemented for demo data; transaction retention needs a formal policy.
- Complete browser and device acceptance tests and security review. Only then consider TestFlight/App Store submission, subject to explicit approval.
