import rows from './venue-menu.json';
import type { MenuItem } from './index';
export const menuChecked = '2026-11-12';
export const menuSources = [
  {
    id: 'main',
    name: 'Main menu',
    url: 'https://www.caferene.co.uk/uploads/9Aj8gQwN/MainMenu26.pdf',
    note: 'Monday–Saturday · sandwiches and wraps Monday–Saturday. Light bites: any three £18.95. Desserts: any three £18.',
  },
  {
    id: 'brunch',
    name: 'Brunch',
    url: 'https://www.caferene.co.uk/uploads/yUbi1uUD/BrunchMenuFeb26__msi___png.png',
    note: 'Monday–Saturday · 11am–3pm · no substitutions.',
  },
  {
    id: 'sunday',
    name: 'Sunday',
    url: 'https://www.caferene.co.uk/uploads/nld5L8AS/SundayMenuMay26.pdf',
    note: 'Sunday · 12–5pm. Any roast plus dessert £20 when ordered together. Light bites: any three £18.95. Desserts: any three £18.',
  },
  {
    id: 'festive',
    name: 'Festive 2026',
    url: 'https://www.caferene.co.uk/uploads/NnMcDvP1/XmasMenu26.pdf',
    note: 'Three courses £35 per guest · £5 deposit per guest · book with the venue.',
  },
  {
    id: 'christmas-day',
    name: 'Christmas Day',
    url: 'https://www.caferene.co.uk/uploads/DzM3Euye/XmasDAYMenu26.pdf',
    note: 'Three courses £65 per guest · £5 deposit and pre-order required · open noon, lunch 2pm, close 6pm. Bucks Fizz on arrival and bread rolls with butter.',
  },
  {
    id: 'christmas-children',
    name: 'Children’s Christmas Day',
    url: 'https://www.caferene.co.uk/uploads/bTd1R5Tp/XmasDAYChildrensMenu26__msi___png.png',
    note: 'Three courses £30 per child under 12 · £5 deposit and pre-order required · fruit juice on arrival, bread rolls with butter.',
  },
];
export type PublishedMenuItem = MenuItem & {
  menuEdition: string;
  sourceUrl: string;
  sourceChecked: string;
  imageKey: string;
};
export const publishedMenu: PublishedMenuItem[] = rows.map((row) => ({
  ...row,
  available: true,
  approved: false,
  alcohol: false,
  allergens: null,
  sourceUrl: menuSources.find((s) => s.id === row.menuEdition)!.url,
  sourceChecked: menuChecked,
}));
export const festiveCourses = [
  {
    name: 'Prawn Cocktail',
    course: 'Starters',
    imageKey: 'prawn',
    description:
      'Lettuce cup, Marie Rose sauce, crayfish tails and granary bread. Gluten-free on request.',
  },
  {
    name: 'Tomato & Basil Soup',
    course: 'Starters',
    imageKey: 'tomato-soup',
    description: 'White, granary or gluten-free bread. Vegan menu label.',
  },
  {
    name: 'Chicken Liver Parfait',
    course: 'Starters',
    imageKey: 'parfait',
    description: 'Quenelles on granary toast with caramelised red onion chutney.',
  },
  {
    name: 'Arancini',
    course: 'Starters',
    imageKey: 'arancini',
    description:
      'Crispy rice balls stuffed with mozzarella, black olive and sundried tomato sauce.',
  },
  {
    name: 'Turkey Breast',
    course: 'Mains',
    imageKey: 'turkey',
    description:
      'Sage and onion stuffing, roast potatoes, parsnip, carrot, sprouts, cabbage, cauliflower, broccoli, pigs in blankets and René gravy.',
  },
  {
    name: 'Slow Roasted Brisket of Beef',
    course: 'Mains',
    imageKey: 'brisket',
    description:
      'Horseradish and mustard beef brisket, creamy mash, seasonal vegetables and red wine jus.',
  },
  {
    name: 'Salmon Fillet',
    course: 'Mains',
    imageKey: 'salmon',
    description:
      'Roasted in garlic butter and lemon; baby new potatoes, seasonal vegetables, lemon and dill sauce. Gluten-free menu label.',
  },
  {
    name: 'Festive Vegetable Wellington',
    course: 'Mains',
    imageKey: 'wellington',
    description: 'Seasonal vegetables, roast potatoes and gravy. Vegan menu label.',
  },
  {
    name: 'Christmas Pudding',
    course: 'Desserts',
    imageKey: 'christmas-pudding',
    description: 'Individual traditional Christmas pudding with brandy sauce.',
  },
  {
    name: 'Winter Berry Cheesecake',
    course: 'Desserts',
    imageKey: 'winter-cheesecake',
    description:
      'Fruit and berry topped vanilla cheesecake with vegan ice cream. Vegan and gluten-free menu labels.',
  },
  {
    name: 'Trillionaires Chocolate Tart',
    course: 'Desserts',
    imageKey: 'chocolate-tart',
    description: 'Vanilla ice cream. Vegan and gluten-free menu labels.',
  },
  {
    name: 'Selection of Cheeses',
    course: 'Desserts',
    imageKey: 'cheeseboard',
    description: 'Brie, Cheddar and Stilton, biscuits, grapes, celery and chutney.',
  },
];
export function seasonalMenu(id: string) {
  if (id === 'christmas-children')
    return [
      {
        name: 'Veggie Dippers',
        course: 'Starters',
        imageKey: 'dippers',
        description: 'Carrot batons, cucumber and celery sticks with hummus. Vegan menu label.',
      },
      ...festiveCourses.filter((d) => ['Tomato & Basil Soup', 'Arancini'].includes(d.name)),
      ...festiveCourses.filter((d) => d.course === 'Mains'),
      ...festiveCourses.filter((d) => d.course === 'Desserts' && d.name !== 'Selection of Cheeses'),
      {
        name: 'Trio of Ice Creams',
        course: 'Desserts',
        imageKey: 'icecream',
        description: 'Three scoops: vanilla, chocolate, honeycomb or strawberry.',
      },
    ];
  return festiveCourses;
}
