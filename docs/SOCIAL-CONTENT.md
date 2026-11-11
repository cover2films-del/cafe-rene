# Current events and ongoing social imports

The app now includes factual event names, dates/times, free-entry information and concise original descriptions transcribed from the **official Café René November 2026 programme**, linked from https://www.caferene.co.uk/events32897205y0w609734. Dates are Europe/London (November = GMT). The source poster explicitly prints @cafereneglos, verifying that handle through a venue-owned source.

Programme checked 11 November 2026: Alex Comaish (11 Nov, 20:00), Baron Crâne (13 Nov, 21:00), St. Fian (18 Nov, 20:00), Kayco’ (20 Nov, 21:00), Luke Austin (25 Nov, 20:00), Kingsley & The Allies (27 Nov, 21:00). Past/start-time-passed events are removed automatically. Real programme listings take precedence over sample cards. No mock admission/ticket purchase is offered for a real event; its button opens the official programme.

Actual poster/artist images are not redistributed without reuse permission. The event-card artwork is new typography/geometry, not an artist photograph. Food photographs are licensed illustrative stock, with sources in image-credits.json and explicit labels in both apps. They do not represent actual venue dishes and imply no ingredients or allergens.

## Authorised Meta connection

Public Facebook requests redirected to login/block pages; Instagram requests were throttled. No bypass, private profile scraping, comments, customer identities or fake posts are used.

A manager can now use **Content review → Pull latest posts** after a permitted Meta app/account connection has been provisioned. Configure these server-only environment variables in Render:

- META_GRAPH_VERSION: the supported version of your approved Meta app, such as vXX.0 replaced with the actual version. No outdated/guessed version is hard-coded.
- META_PAGE_ID and META_PAGE_ACCESS_TOKEN: the venue's Facebook Page ID and a token authorised for reading that Page's posts.
- META_INSTAGRAM_ACCOUNT_ID and META_INSTAGRAM_ACCESS_TOKEN: the venue's linked professional Instagram account and the token authorised through **Instagram API with Facebook Login**. This adapter uses graph.facebook.com; Instagram Login tokens for graph.instagram.com require a different adapter.

Required permissions, app review and account roles depend on your Meta app configuration. Use Meta's current official documentation:

- https://developers.facebook.com/docs/pages-api/posts/
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/

Never put these tokens in EXPO_PUBLIC settings or paste them into chat. Tokens travel in Authorization headers and are never returned to clients, stored in provenance or placed in URL query strings.

Refresh reads up to 20 recent posts per configured channel. It is manually triggered, not a scheduled scraper. It stores text, permalink, publication timestamp and an image source reference in the content-review queue with stable IDs; repeated imports do not duplicate records. Image references are not automatically downloaded, embedded or published. Provider errors return a status-only summary, not sensitive response bodies.

## Review and publication

On an imported social record, choose **Review this post and publish an event**. Confirm the actual event date/time (post time is not event time), concise description, genre and explicit free-entry statement. Confirm source review before publication. The backend rejects a non-sample event without a source URL and approval flag.

For imagery, upload an authorised image using the existing manager uploader. It is re-encoded to private WebP and starts in review. Once both reuse permission and review are approved, the content entry exposes `/api/media/ID`, which can be entered as the event image URL. Public delivery checks those approvals on every request; revoking approval removes public access. A URL alone does not establish reuse rights.

Render Free has ephemeral filesystem storage. Bundled food/event artwork survives deployments through GitHub; manager uploads need a persistent object-store adapter before reliable long-term use. This limitation is unchanged.

No real Meta account is connected in this workspace, so provider calls have only been tested with mocked responses. Existing public programme data is current as of the checked date, not a promise of automatic future social updates.
