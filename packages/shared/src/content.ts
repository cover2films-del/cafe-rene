export const eventGenres = ['Blues', 'Rock', 'Folk', 'Funk', 'Reggae', 'DJ', 'Acoustic'] as const;
export const customerInterests = [...eventGenres, 'Food'] as const;
export const foodPhotography: Record<string, { path: string; alt: string }> = {
  soup: {
    path: '/images/generated/soup.webp',
    alt: 'AI-generated illustration of soup based on the published menu; actual presentation may vary',
  },
  'garlic-mushrooms': {
    path: '/images/generated/garlic-mushrooms.webp',
    alt: 'AI-generated illustration of garlic mushrooms based on the published menu; actual presentation may vary',
  },
  goujons: {
    path: '/images/generated/goujons.webp',
    alt: 'AI-generated illustration of goujons based on the published menu; actual presentation may vary',
  },
  whitebait: {
    path: '/images/generated/whitebait.webp',
    alt: 'AI-generated illustration of whitebait based on the published menu; actual presentation may vary',
  },
  'pork-bites': {
    path: '/images/generated/pork-bites.webp',
    alt: 'AI-generated illustration of pork bites based on the published menu; actual presentation may vary',
  },
  'loaded-fries': {
    path: '/images/generated/loaded-fries.webp',
    alt: 'AI-generated illustration of loaded fries based on the published menu; actual presentation may vary',
  },
  'dirty-fries': {
    path: '/images/generated/dirty-fries.webp',
    alt: 'AI-generated illustration of dirty fries based on the published menu; actual presentation may vary',
  },
  'loaded-garlic': {
    path: '/images/generated/loaded-garlic.webp',
    alt: 'AI-generated illustration of loaded garlic based on the published menu; actual presentation may vary',
  },
  'cajun-wrap': {
    path: '/images/generated/cajun-wrap.webp',
    alt: 'AI-generated illustration of cajun wrap based on the published menu; actual presentation may vary',
  },
  'brie-bacon': {
    path: '/images/generated/brie-bacon.webp',
    alt: 'AI-generated illustration of brie bacon based on the published menu; actual presentation may vary',
  },
  'ham-cheddar': {
    path: '/images/generated/ham-cheddar.webp',
    alt: 'AI-generated illustration of ham cheddar based on the published menu; actual presentation may vary',
  },
  'fish-fingers': {
    path: '/images/generated/fish-fingers.webp',
    alt: 'AI-generated illustration of fish fingers based on the published menu; actual presentation may vary',
  },
  tuna: {
    path: '/images/generated/tuna.webp',
    alt: 'AI-generated illustration of tuna based on the published menu; actual presentation may vary',
  },
  avocado: {
    path: '/images/generated/avocado.webp',
    alt: 'AI-generated illustration of avocado based on the published menu; actual presentation may vary',
  },
  falafel: {
    path: '/images/generated/falafel.webp',
    alt: 'AI-generated illustration of falafel based on the published menu; actual presentation may vary',
  },
  club: {
    path: '/images/generated/club.webp',
    alt: 'AI-generated illustration of club based on the published menu; actual presentation may vary',
  },
  beef: {
    path: '/images/generated/beef.webp',
    alt: 'AI-generated illustration of beef based on the published menu; actual presentation may vary',
  },
  tarragon: {
    path: '/images/generated/tarragon.webp',
    alt: 'AI-generated illustration of tarragon based on the published menu; actual presentation may vary',
  },
  cod: {
    path: '/images/generated/cod.webp',
    alt: 'AI-generated illustration of cod based on the published menu; actual presentation may vary',
  },
  sausage: {
    path: '/images/generated/sausage.webp',
    alt: 'AI-generated illustration of sausage based on the published menu; actual presentation may vary',
  },
  chilli: {
    path: '/images/generated/chilli.webp',
    alt: 'AI-generated illustration of chilli based on the published menu; actual presentation may vary',
  },
  curry: {
    path: '/images/generated/curry.webp',
    alt: 'AI-generated illustration of curry based on the published menu; actual presentation may vary',
  },
  lasagne: {
    path: '/images/generated/lasagne.webp',
    alt: 'AI-generated illustration of lasagne based on the published menu; actual presentation may vary',
  },
  'squid-scampi': {
    path: '/images/generated/squid-scampi.webp',
    alt: 'AI-generated illustration of squid scampi based on the published menu; actual presentation may vary',
  },
  'earth-bowl': {
    path: '/images/generated/earth-bowl.webp',
    alt: 'AI-generated illustration of earth bowl based on the published menu; actual presentation may vary',
  },
  'steak-pie': {
    path: '/images/generated/steak-pie.webp',
    alt: 'AI-generated illustration of steak pie based on the published menu; actual presentation may vary',
  },
  burger: {
    path: '/images/generated/burger.webp',
    alt: 'AI-generated illustration of burger based on the published menu; actual presentation may vary',
  },
  'very-dan': {
    path: '/images/generated/very-dan.webp',
    alt: 'AI-generated illustration of very dan based on the published menu; actual presentation may vary',
  },
  'chicken-burger': {
    path: '/images/generated/chicken-burger.webp',
    alt: 'AI-generated illustration of chicken burger based on the published menu; actual presentation may vary',
  },
  veggie: {
    path: '/images/generated/veggie.webp',
    alt: 'AI-generated illustration of veggie based on the published menu; actual presentation may vary',
  },
  rump: {
    path: '/images/generated/rump.webp',
    alt: 'AI-generated illustration of rump based on the published menu; actual presentation may vary',
  },
  gammon: {
    path: '/images/generated/gammon.webp',
    alt: 'AI-generated illustration of gammon based on the published menu; actual presentation may vary',
  },
  'pork-loin': {
    path: '/images/generated/pork-loin.webp',
    alt: 'AI-generated illustration of pork loin based on the published menu; actual presentation may vary',
  },
  'grilled-chicken': {
    path: '/images/generated/grilled-chicken.webp',
    alt: 'AI-generated illustration of grilled chicken based on the published menu; actual presentation may vary',
  },
  chips: {
    path: '/images/generated/chips.webp',
    alt: 'AI-generated illustration of chips based on the published menu; actual presentation may vary',
  },
  fries: {
    path: '/images/generated/fries.webp',
    alt: 'AI-generated illustration of fries based on the published menu; actual presentation may vary',
  },
  'onion-rings': {
    path: '/images/generated/onion-rings.webp',
    alt: 'AI-generated illustration of onion rings based on the published menu; actual presentation may vary',
  },
  'cheesy-garlic': {
    path: '/images/generated/cheesy-garlic.webp',
    alt: 'AI-generated illustration of cheesy garlic based on the published menu; actual presentation may vary',
  },
  icecream: {
    path: '/images/generated/icecream.webp',
    alt: 'AI-generated illustration of icecream based on the published menu; actual presentation may vary',
  },
  crumble: {
    path: '/images/generated/crumble.webp',
    alt: 'AI-generated illustration of crumble based on the published menu; actual presentation may vary',
  },
  toffee: {
    path: '/images/generated/toffee.webp',
    alt: 'AI-generated illustration of toffee based on the published menu; actual presentation may vary',
  },
  brownie: {
    path: '/images/generated/brownie.webp',
    alt: 'AI-generated illustration of brownie based on the published menu; actual presentation may vary',
  },
  cheesecake: {
    path: '/images/generated/cheesecake.webp',
    alt: 'AI-generated illustration of cheesecake based on the published menu; actual presentation may vary',
  },
  cheeseboard: {
    path: '/images/generated/cheeseboard.webp',
    alt: 'AI-generated illustration of cheeseboard based on the published menu; actual presentation may vary',
  },
  'roast-beef': {
    path: '/images/generated/roast-beef.webp',
    alt: 'AI-generated illustration of roast beef based on the published menu; actual presentation may vary',
  },
  turkey: {
    path: '/images/generated/turkey.webp',
    alt: 'AI-generated illustration of turkey based on the published menu; actual presentation may vary',
  },
  prawn: {
    path: '/images/generated/prawn.webp',
    alt: 'AI-generated illustration of prawn based on the published menu; actual presentation may vary',
  },
  breakfast: {
    path: '/images/generated/breakfast.webp',
    alt: 'AI-generated illustration of breakfast based on the published menu; actual presentation may vary',
  },
  mash: {
    path: '/images/generated/mash.webp',
    alt: 'AI-generated illustration of mash based on the published menu; actual presentation may vary',
  },
  'new-potatoes': {
    path: '/images/generated/new-potatoes.webp',
    alt: 'AI-generated illustration of new potatoes based on the published menu; actual presentation may vary',
  },
  'garlic-bread': {
    path: '/images/generated/garlic-bread.webp',
    alt: 'AI-generated illustration of garlic bread based on the published menu; actual presentation may vary',
  },
  vegetables: {
    path: '/images/generated/vegetables.webp',
    alt: 'AI-generated illustration of vegetables based on the published menu; actual presentation may vary',
  },
  olives: {
    path: '/images/generated/olives.webp',
    alt: 'AI-generated illustration of olives based on the published menu; actual presentation may vary',
  },
  'cheesy-chips': {
    path: '/images/generated/cheesy-chips.webp',
    alt: 'AI-generated illustration of cheesy chips based on the published menu; actual presentation may vary',
  },
  'side-salad': {
    path: '/images/generated/side-salad.webp',
    alt: 'AI-generated illustration of side salad based on the published menu; actual presentation may vary',
  },
  mozzarella: {
    path: '/images/generated/mozzarella.webp',
    alt: 'AI-generated illustration of mozzarella based on the published menu; actual presentation may vary',
  },
  'veggie-breakfast': {
    path: '/images/generated/veggie-breakfast.webp',
    alt: 'AI-generated illustration of veggie breakfast based on the published menu; actual presentation may vary',
  },
  'breakfast-bap': {
    path: '/images/generated/breakfast-bap.webp',
    alt: 'AI-generated illustration of breakfast bap based on the published menu; actual presentation may vary',
  },
  'roast-pork': {
    path: '/images/generated/roast-pork.webp',
    alt: 'AI-generated illustration of roast pork based on the published menu; actual presentation may vary',
  },
  wellington: {
    path: '/images/generated/wellington.webp',
    alt: 'AI-generated illustration of wellington based on the published menu; actual presentation may vary',
  },
  salmon: {
    path: '/images/generated/salmon.webp',
    alt: 'AI-generated illustration of salmon based on the published menu; actual presentation may vary',
  },
  caesar: {
    path: '/images/generated/caesar.webp',
    alt: 'AI-generated illustration of caesar based on the published menu; actual presentation may vary',
  },
  'roast-potatoes': {
    path: '/images/generated/roast-potatoes.webp',
    alt: 'AI-generated illustration of roast potatoes based on the published menu; actual presentation may vary',
  },
  yorkshire: {
    path: '/images/generated/yorkshire.webp',
    alt: 'AI-generated illustration of yorkshire based on the published menu; actual presentation may vary',
  },
  cauliflower: {
    path: '/images/generated/cauliflower.webp',
    alt: 'AI-generated illustration of cauliflower based on the published menu; actual presentation may vary',
  },
  'tomato-soup': {
    path: '/images/generated/tomato-soup.webp',
    alt: 'AI-generated illustration of tomato soup based on the published menu; actual presentation may vary',
  },
  parfait: {
    path: '/images/generated/parfait.webp',
    alt: 'AI-generated illustration of parfait based on the published menu; actual presentation may vary',
  },
  arancini: {
    path: '/images/generated/arancini.webp',
    alt: 'AI-generated illustration of arancini based on the published menu; actual presentation may vary',
  },
  brisket: {
    path: '/images/generated/brisket.webp',
    alt: 'AI-generated illustration of brisket based on the published menu; actual presentation may vary',
  },
  'christmas-pudding': {
    path: '/images/generated/christmas-pudding.webp',
    alt: 'AI-generated illustration of christmas pudding based on the published menu; actual presentation may vary',
  },
  'winter-cheesecake': {
    path: '/images/generated/winter-cheesecake.webp',
    alt: 'AI-generated illustration of winter cheesecake based on the published menu; actual presentation may vary',
  },
  'chocolate-tart': {
    path: '/images/generated/chocolate-tart.webp',
    alt: 'AI-generated illustration of chocolate tart based on the published menu; actual presentation may vary',
  },
  dippers: {
    path: '/images/generated/dippers.webp',
    alt: 'AI-generated illustration of dippers based on the published menu; actual presentation may vary',
  },
  'croque-garlic': {
    path: '/images/generated/croque-garlic.webp',
    alt: 'AI-generated illustration of croque garlic based on the published menu; actual presentation may vary',
  },
  'chicken-pie': {
    path: '/images/generated/chicken-pie.webp',
    alt: 'AI-generated illustration of chicken pie based on the published menu; actual presentation may vary',
  },
  'mushroom-pie': {
    path: '/images/generated/mushroom-pie.webp',
    alt: 'AI-generated illustration of mushroom pie based on the published menu; actual presentation may vary',
  },
  'kids-fish': {
    path: '/images/generated/kids-fish.webp',
    alt: 'AI-generated illustration of kids fish based on the published menu; actual presentation may vary',
  },
  'kids-sausage': {
    path: '/images/generated/kids-sausage.webp',
    alt: 'AI-generated illustration of kids sausage based on the published menu; actual presentation may vary',
  },
  'kids-chicken': {
    path: '/images/generated/kids-chicken.webp',
    alt: 'AI-generated illustration of kids chicken based on the published menu; actual presentation may vary',
  },
  sirloin: {
    path: '/images/generated/sirloin.webp',
    alt: 'AI-generated illustration of sirloin based on the published menu; actual presentation may vary',
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
