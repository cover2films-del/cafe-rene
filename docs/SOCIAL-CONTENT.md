# Official branding, artwork and ongoing refresh

The venue user explicitly requested the official Café René logo, website What’s On graphics and site fonts on 11 November 2026. The app now uses those assets and an attributed original programme, not substitute artist artwork. The website’s inline CSS specifies Roboto body text, Roboto Slab headlines and Bree Serif navigation. Open-licensed font copies are bundled locally with their licence files. Food photos remain clearly labelled illustrative stock.

The source is https://www.caferene.co.uk/events32897205y0w609734. The official November poster also confirms @cafereneglos. Factual dates/descriptions are transcribed; past/start-time-passed structured events are excluded. Whole calendar graphics can contain earlier dates as part of their original monthly layout, so the artwork board is distinguished from the upcoming-event list.

## Automatic public website refresh

The API starts a refresh shortly after startup and checks whether another is due every minute. Default refresh interval: 15 minutes, configurable with CONTENT_REFRESH_MINUTES (5–60). A PostgreSQL lease prevents concurrent refreshes. Only public HTTPS images under www.caferene.co.uk/uploads are fetched; redirects, external hosts, oversized files and unsupported images are rejected. The parser handles the website’s public noscript image fallback without running website scripts or bypassing access restrictions.

Images are decoded, resized, stripped of metadata and re-encoded as WebP. Logo and programme bytes live in PostgreSQL's venue_assets table, so they survive Render Free filesystem resets. Responses use ETags and content-hash URLs. A failed source request keeps the last successful board. The bundled official November artwork and logo provide a first-load fallback. Filenames with an identified month are hidden from the public board after that month; unknown-date artwork is shown as source artwork, not invented structured event dates.

Web/native clients refresh public content every minute while visible/active. **Render Free can sleep**: scheduled refreshes do not run while the host sleeps. Opening the app wakes it; this is not an always-on background service. No fake uptime pings were added.

New graphics generate a manager review record for adding precise structured dates. Graphics can refresh automatically because the user requested trusted venue artwork, but the software does not guess new performance dates from a poster. Staff can force a website/connected-social refresh from Content review.

## Facebook and Instagram

Public Facebook requests require login/block handling; Instagram has throttled unauthenticated requests. No access restriction is bypassed. To enable ongoing social pulls, configure server-only credentials in Render:

- META_GRAPH_VERSION: actual supported version of your approved Meta app.
- META_PAGE_ID and META_PAGE_ACCESS_TOKEN: the authorised venue Facebook Page.
- META_INSTAGRAM_ACCOUNT_ID and META_INSTAGRAM_ACCESS_TOKEN: the linked professional Instagram account using Instagram API **with Facebook Login** (graph.facebook.com).
- SOCIAL_AUTO_PUBLISH=true: automatically show venue-owned posts from those authorised accounts, as requested. Set false to retain a review-only workflow.

Tokens remain server-side in Authorization headers; they are never in mobile bundles, URLs, provenance or client responses. Only Page posts/professional-account media are requested, not comments, messages, personal profiles or reviews. Current account tokens and provider permission/app-review requirements must be supplied through secret settings. Official references: https://developers.facebook.com/docs/pages-api/posts/ and https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/ (documentation requests were rate-limited during this session).

Scheduled refresh reads up to 20 recent posts per channel with stable IDs, updates edited automatic posts and respects manager rejection. A small bounded batch of permitted Meta CDN images is cached as WebP in PostgreSQL; no fragile hotlink or heavy social embed is rendered. Expired/unavailable images leave the original text and permalink available. Public social-image delivery requires an approved post still linked to that asset.

The public feed shows post text, publication date, original permalink and cached image. **A post timestamp is never treated as the event date.** Adding a structured event remains a manager action. With no authorised account connected, customers see links to the genuine Facebook/Instagram accounts, not fabricated posts. No real Meta credentials are configured here; provider responses were mocked in tests.

## User uploads

The manager uploader still saves private optimised WebP files locally. Those separate manual uploads need persistent object storage for reliable Render Free retention; automatic website/social assets now use database storage. To publish a manually uploaded event image, both permission and review must be approved. Revoking approval stops public delivery on subsequent requests. User uploads and automatically refreshed official venue assets are separate storage paths.
