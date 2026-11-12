export type Role = 'customer' | 'staff' | 'manager' | 'admin';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type Fulfilment =
  | 'awaiting_payment'
  | 'awaiting_acceptance'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';
export type MenuItem = {
  menuEdition?: string;
  sourceUrl?: string;
  sourceChecked?: string;
  imageKey?: string;
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  available: boolean;
  approved: boolean;
  alcohol: boolean;
  dietary: string[];
  allergens: string[] | null;
  modifiers: { id: string; name: string; price: number }[];
};
export type BasketLine = { itemId: string; quantity: number; modifierIds: string[] };
export const money = (p: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(p / 100);
export const venueDay = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
export const challenges = [
  {
    id: 'first',
    name: 'First Night at René',
    description: 'Make your first verified visit.',
    target: 1,
    kind: 'visit',
    icon: '✦',
  },
  {
    id: 'regular',
    name: 'René Regular',
    description: 'Visit on five separate days.',
    target: 5,
    kind: 'visit',
    icon: '♜',
  },
  {
    id: 'music',
    name: 'Live Music Explorer',
    description: 'Attend three different verified performances.',
    target: 3,
    kind: 'music',
    icon: '♫',
  },
  {
    id: 'quiz',
    name: 'Quiz Crew',
    description: 'Join a quiz, verified by our team.',
    target: 1,
    kind: 'quiz',
    icon: '?',
  },
  {
    id: 'festival',
    name: 'Festival Faithful',
    description: 'Visit on two verified festival days.',
    target: 2,
    kind: 'festival',
    icon: '☀',
  },
  {
    id: 'menu',
    name: 'Menu Explorer',
    description: 'Try three different food dishes.',
    target: 3,
    kind: 'food',
    icon: '♧',
  },
  {
    id: 'history',
    name: 'René History Hunt',
    description: 'Find two venue clues and ask staff to verify.',
    target: 2,
    kind: 'history',
    icon: '⌕',
  },
];
export const venue = {
  name: 'Café René',
  address: '31 Southgate Street, Gloucester, GL1 1TP',
  phone: '01452 309340',
  email: 'info@caferene.co.uk',
  website: 'https://www.caferene.co.uk/',
  facebook: 'https://www.facebook.com/thecaferene/?locale=en_GB',
  instagram: 'https://www.instagram.com/cafereneglos/?hl=en',
  hours: 'Sun–Thu 11am–midnight · Fri–Sat 11am–3am',
  foodHours: 'Mon–Sat 11am–8pm · Sun 11am–5pm',
  hoursReview: true,
};
