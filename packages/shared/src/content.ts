export const eventGenres = ['Blues', 'Rock', 'Folk', 'Funk', 'Reggae', 'DJ', 'Acoustic'] as const;
export const customerInterests = [...eventGenres, 'Food'] as const;
export const foodPhotography: Record<string, { path: string; alt: string }> = {
  burger: {
    path: '/images/food/burger.webp',
    alt: 'Illustrative burger photography; not a photograph of René’s dish',
  },
  cod: {
    path: '/images/food/cod.webp',
    alt: 'Illustrative fish and chips photography; not a photograph of René’s dish',
  },
  fries: {
    path: '/images/food/fries.webp',
    alt: 'Illustrative fries photography; not a photograph of René’s dish',
  },
  brownie: {
    path: '/images/food/brownie.webp',
    alt: 'Illustrative brownie photography; not a photograph of René’s dish',
  },
  soup: {
    path: '/images/food/soup.webp',
    alt: 'Illustrative soup photography; not a photograph of René’s dish',
  },
};
export const programmeSource = 'https://www.caferene.co.uk/events32897205y0w609734';
export const programmeChecked = '2026-11-11';
const programme = [
  [
    'alex-comaish',
    'Alex Comaish',
    'Folk',
    '2026-11-11T20:00:00Z',
    'Folk-punk energy meets melodic indie rock in a solo set from the South West.',
  ],
  [
    'baron-crane',
    'Baron Crâne',
    'Rock',
    '2026-11-13T21:00:00Z',
    'From Paris: jazz, groove and heavy psychedelic rock with an experimental edge.',
  ],
  [
    'st-fian',
    'St. Fian',
    'Folk',
    '2026-11-18T20:00:00Z',
    'Original folk with a raw, traditional edge and stories rooted in folklore.',
  ],
  [
    'kayco',
    'Kayco’',
    'Funk',
    '2026-11-20T21:00:00Z',
    'A five-piece bringing soulful vocals, sax and a danceable blend of funk, jazz and rock.',
  ],
  [
    'luke-austin',
    'Luke Austin',
    'Blues',
    '2026-11-25T20:00:00Z',
    'Originals, covers and requests with blues-rock flavour and a touch of grunge.',
  ],
  [
    'kingsley-allies',
    'Kingsley & The Allies',
    'Reggae',
    '2026-11-27T21:00:00Z',
    'Roots reggae, deep grooves and blues-influenced guitar with a distinctive vocal sound.',
  ],
];
export const officialProgramme = programme.map(([slug, title, genre, date, description]) => ({
  id: 'nov26-' + slug,
  title,
  genre,
  date,
  description,
  sample: false,
  free: true,
  sourceUrl: programmeSource,
  verifiedAt: programmeChecked,
  approvedReview: true,
  imageUrl: '/images/events/nov26-' + slug + '.webp',
  imageKind: 'venue-programme',
}));
export function visibleEvents(events: any[], now = Date.now()) {
  const published = events.some((e) => e.sample === false)
    ? events.filter((e) => e.sample === false)
    : events;
  return published
    .filter((e) => new Date(e.date).getTime() > now)
    .sort((a, b) => a.date.localeCompare(b.date));
}
export const posPlan = {
  vendor: 'TouchOffice Web / ICRTouch',
  supplier: 'Eposbuddy',
  status: 'awaiting_supplier_access',
  orderDelivery: 'mock',
  requirements: [
    'Confirm TouchOffice Web or Web+ licence and TouchPoint version',
    'Supplier-approved order-injection interface and sandbox',
    'Venue/site identifier and PLU/modifier/tax mappings',
    'Acceptance/status callbacks, idempotency and refund reconciliation',
  ],
  sources: [
    'https://www.eposbuddy.com/',
    'https://icrtouch.com/products/touchoffice-web/',
    'https://icrtouch.com/products/touchtakeaway/',
  ],
};
