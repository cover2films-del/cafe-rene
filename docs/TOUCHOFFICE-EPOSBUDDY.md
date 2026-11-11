# TouchOffice / Eposbuddy integration brief

Venue owner identifies the installed EPOS as **TouchOffice supplied by Eposbuddy**. Recorded in the app's integration plan and staff Integrations screen. No vendor API credentials, site identifier, till version or partner documentation has been supplied. Order submission remains mock; this change does not connect to or modify a live till.

Official references checked 11 November 2026:

- https://www.eposbuddy.com/ — supplier describes ICR-based hospitality solutions and integrated marketing.
- https://icrtouch.com/products/touchoffice-web/ — TouchOffice Web is the cloud back-office/reporting/management product.
- https://icrtouch.com/products/touchoffice-web/touchoffice-web-plus/ — some integrations require Web+ functionality/licensing.
- https://icrtouch.com/products/touchtakeaway/ — ICRTouch's online ordering product integrates with TouchPoint, TouchKitchen and TouchOffice Web.

TouchOffice back-office access alone does **not** establish permission or capability to inject third-party orders into tills. Do not guess an HTTP order endpoint from a reporting/voucher API.

Ask Eposbuddy to confirm:

1. Installed products and versions: TouchPoint tills, TouchOffice Web or Web+, TouchKitchen/ByTable/TouchTakeaway, and applicable licences.
2. The approved third-party order-entry route for a custom Expo/web app, partner onboarding and sandbox documentation. A reporting-only token is insufficient.
3. Venue/site identifier, sandbox credentials and scopes; provide them through secret settings, never chat, GitHub or the mobile bundle.
4. Menu PLU, modifier, VAT/tax, department/course and table mappings, availability sync and ordering hours.
5. Order idempotency, explicit acceptance/rejection, kitchen routing/status callbacks, retries and reconciliation.
6. Payment ownership, supported gateways/wallets, tender mappings, cancellations and full/partial refunds. Confirm bar payment/split tabs separately.
7. Loyalty/voucher ownership to avoid issuing duplicate benefits across this app and the existing EPOS scheme.

The existing POSAdapter interface, immutable item/price snapshots, signed-payment flow, delivery queue and staff resolution workflow remain the integration boundary. A real adapter should map those contracts to supplier-approved APIs without changing customer navigation. Credentials remain on the server. APP_MODE=live continues to fail closed.

No message has been sent to Eposbuddy. The document is a technical checklist for the venue owner to take to the supplier.
