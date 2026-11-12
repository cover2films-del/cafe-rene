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

## A practical test with René’s actual tills

Give Eposbuddy the checklist above and ask for a **sandbox or isolated test till/table**, an approved order-entry API specification, and named technical contact. A sample supplier request:

> We are building Café René’s customer web/iPhone app. Please confirm our installed ICRTouch products and versions, which supported API permits third-party menu reads and order injection, and whether a partner licence is required. Can you supply sandbox/test-site access, a test terminal/table and PLU/modifier/tax/table/tender mappings? We also need acceptance/status callbacks, cancellation/refund rules, idempotency and kitchen routing behaviour. Please provide credentials through a secure channel, not a chat message or source repository.

Once documentation and sandbox access are available:

1. Implement a server-only adapter against the documented API; keep provider credentials in Render secrets. Do not ship them to Expo, EAS Update or the browser.
2. Import the EPOS catalogue with stable PLUs and modifier IDs. Treat the website catalogue as a browsing source, not till mapping. Reconcile VAT, prices, dietary/allergen data, stock, table IDs and service windows with the supplier.
3. Send one low-value **test** order to the isolated table, with test payment/tender handling agreed by the supplier. Verify one kitchen ticket, acknowledgement and order status. Do not send real till transactions from the current simulated payment flow.
4. Test modifiers, unavailable products, table and collection orders, duplicate taps, response timeouts, retry after a network outage, rejection, cancellation, full/partial refunds and receipt/total reconciliation. Confirm retries cannot create two kitchen tickets or two charges.
5. Test points/stamps only against confirmed completed orders and reverse them on refunds. Keep synthetic member history separate from any real sales reporting.
6. Venue staff sign off the actual till/kitchen behaviour and payment ownership before enabling a narrowly scoped live test. Existing live mode remains disabled until a verified adapter and payment flow replace the simulated ones.

A backend-only adapter/configuration change usually deploys through Render without rebuilding the phone app. A compatible native UI change can use EAS Update once the phone has the update-enabled build. New native modules, entitlements, permissions or fingerprint changes require another EAS build.
