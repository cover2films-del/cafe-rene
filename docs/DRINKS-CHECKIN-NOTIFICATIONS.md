# Drinks, check-in and phone notifications

## Order → Beers, cocktails & more

The public `/api/drinks` endpoint returns 16 illustrated drink styles across draught, craft/specials, cocktails, shooters and alcohol-free choices. These are browsing/recipe entries, not assertions about René’s current brands or stock. Tap availability and prices start unconfirmed. The mixologist filters cocktail inspiration by flavour and base, supports alcohol-free choices and gives an honest empty result for an unmatched combination. Expandable histories rotate through sourced, short facts; disputed origin stories are qualified. Sources are linked in each card.

Managers/admins can use the web bar-board editor to publish a guest drink, update availability, enter a confirmed price and attach an official website/social source. Standard style history and artwork supply the base; no invented brand origin is generated. Server validation and audit cover edits. Drinks remain non-orderable until the EPOS catalogue and payment/tender mapping are supplied; editing a displayed price does not bypass checkout or create a till PLU.

## Artwork and refreshing sources

Artist photo crops are taken from the venue’s authorised programme graphics, retained separately from the readable full programme. Approved social post artwork can replace the background dynamically when the caption names exactly one known performer; multiple-act posts are not assigned to one band. Explicit manager artwork wins. Posts cannot supply inferred event dates. Web/mobile bootstrap refreshes pick up image changes; unavailable media falls back to existing artwork.

The website refresh also discovers currently published menu links on `/restaurant`. New links appear in the drinks source drawer. Approved Facebook/Instagram bar posts appear in the bar feed; new imports depend on server-side authorised META_* credentials and the existing 15-minute refresh. Official programme changes update the artwork wall and can queue an opted-in programme notification. Exact event dates, current tap stock, prices and allergens still need an authoritative source or staff confirmation. The free hosting server must be awake for scheduled refreshing and notification delivery.

## Printable check-in

Files: `apps/web/public/print/rene-check-in.pdf` and `.png`.

Initial URL: `https://cafe-rene.onrender.com/?checkin=rene-gloucester-v1`.

Print the PDF at normal size and place it at the venue. The native app camera recognises the URL and the custom `caferene://checkin?code=...` link. iPhone’s own camera opens the website, which provides sign-in, a confirm-check-in button and an app-opening link. Signing in after a scan preserves the pending code. A Home prompt and My René journal show the result.

`POST /api/visits/check-in` uses the authenticated member, a server-current revocable code and a unique Europe/London day. Duplicate scans return the existing record. These rows are deliberately separate from verified purchases/visits: a copied static QR cannot prove physical presence and does not issue food stamps, points or verified-visit achievements. Existing rotating staff codes remain available for verified check-in. Journal records are included in account export and deleted with the account.

Staff can print the current version from the dashboard. A manager can replace the code; old versions are rejected. The bundled PDF is version 1; after revoking it, print the new QR from the staff dashboard rather than reusing that PDF.

## iPhone notification setup

This adds `expo-notifications` and `expo-device`, so native runtime is now **1.0.0-native.3**. Build/install a new signed preview; an over-the-air update cannot add these native modules or APNs entitlements.

1. Pull the latest branch and run `npm.cmd ci` at the repo root.
2. From `apps/mobile`, run `npx.cmd eas-cli@latest build --platform ios --profile preview --clear-cache`.
3. Let EAS configure the Apple Push Notifications key for the correct Developer team. If necessary, use `npx.cmd eas-cli@latest credentials -p ios` → Push Notifications to create/select the APNs key. Do not paste private keys/passwords into chat.
4. Install on a physical iPhone. Open **My René → Stay in the René loop**, choose categories and press **Enable phone notifications**. Accept iOS’s permission prompt.
5. Use **Send me a test notification**, then test a private message from another signed-in member. The backend and Apple/Expo push delivery must be available. Notification Centre/banner presentation also follows iOS Settings and Focus mode.

Messages, offers, rewards, gigs and general venue updates have independent device choices. Offers are off initially and require explicit marketing consent. Other categories are selected visibly before registration; no OS permission is requested on startup. Lock-screen messages contain generic text, not the private message body. Notification taps open the appropriate app section and select an authorised circle when available.

Only active circle members are queued for a message; authors and invited/non-members are excluded. Duplicate message submissions/publication keys do not create duplicate device deliveries. Worker delivery rechecks device ownership, active membership, deleted accounts, category choices and offer consent. Logout disables that device when online; deletion removes its tokens and queued deliveries. Registration on a new account cannot deliver the prior account’s queued messages. Offline logout cannot contact the server, so OS Settings remains an immediate way to stop banners.

The sender runs every 15 seconds by default, with a `PUSH_DELIVERY_ENABLED=false` pause switch. An optional server-only `EXPO_PUSH_ACCESS_TOKEN` supports Expo push access security. Tickets are followed by receipt checks; invalid device registrations are disabled. Explicit provider rejection may retry; ambiguous transport failures are not resent automatically to avoid duplicate alerts. No live Apple/Expo send was performed in this workspace. Keep the backend running for timely delivery; a sleeping free server cannot promise immediate notifications.
