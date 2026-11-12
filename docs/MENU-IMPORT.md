# Published menu import, 12 November 2026

Source: https://www.caferene.co.uk/restaurant

All six currently linked food menus are represented in `packages/shared/src/venue-menu.ts` and `venue-menu.json`: main, brunch, Sunday, festive, Christmas Day, and children’s Christmas Day. The main/brunch/Sunday catalogue contains 96 priced entries. Seasonal choices are browsable separately at their published set-course prices, with direct links to original documents and venue booking contact. Main and Sunday sirloin/gammon prices differ in the source and are intentionally kept separate. Published multi-buy and roast/dessert deals are described, not silently applied by an unimplemented bundle-pricing system. No individual prices have been invented for set-menu courses.

Main and Sunday text extracted from source PDFs; brunch and children’s Christmas menus read from published PNGs using OCR then checked against the source text. Dietary labels are transcriptions; there is no verified allergen matrix. Customers must ask venue staff. Actual service availability is confirmed by the venue. EPOS prices/PLUs and order-entry integration remain unconnected; website menu IDs are not till PLUs.

Source-backed entries are added idempotently. Existing manager-edited names, prices and availability are preserved on restart. Older items receive source/edition/image metadata only when no source metadata exists. Soft drink/guest ale history fixtures have no verified published drinks list: they are kept for immutable example receipts and disabled for new ordering until a real bar catalogue is provided. Do not treat their fixture prices as current venue prices.

80 AI-generated dish illustrations are bundled as optimised WebP assets in web and native. Prompts use the published descriptions, but presentation, garnishes and portions can differ; images are labelled AI illustrations, not photographs of René’s food. Illustration source sheets remain in the generation workspace; output crops are served locally without an external image service. Some similar dishes share a relevant illustration; plate contents do not establish ingredients or allergen safety. Original licensed stock food images remain used for decorative backgrounds/hero panels, as documented in photography credits.

This is a checked import, not automatic parsing of arbitrary future menu PDFs. Check new menu versions and approve their prices/availability with staff before enabling real orders. Eposbuddy’s approved menu API is the appropriate source for future stock/price synchronisation once supplied.

Simple Icons supplies Facebook and Instagram vector brand marks under CC0; brand trademarks remain their respective owners’ property: https://simpleicons.org/
