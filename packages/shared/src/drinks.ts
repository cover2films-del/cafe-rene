import items from './drinks.json';
export const drinkCategories = [
  'On tap',
  'Craft & specials',
  'Cocktails',
  'Shooters',
  'Alcohol-free',
] as const;
export const cocktailTastes = ['Any', 'Citrus', 'Fruity', 'Bitter', 'Coffee', 'Malty', 'Sweet', 'Herbal', 'Spiced', 'Refreshing'] as const;
export const cocktailBases = ['Any', 'Rum', 'Gin', 'Vodka', 'Tequila', 'Whisky', 'Liqueur', 'Brandy', 'Cider', 'None'] as const;
export const drinkLibrary = items;
export function mixologist(drinks: typeof items, taste: string, base: string) {
  return drinks
    .filter(
      (d) =>
        ['Cocktails', 'Alcohol-free'].includes(d.category) &&
        d.availability !== 'unavailable' &&
        (taste === 'Any' || d.taste === taste) &&
        (base === 'Any' || d.base === base),
    )
    .slice(0, 8);
}
export function drinkFact(item: (typeof items)[number], index: number) {
  return item.history[((index % item.history.length) + item.history.length) % item.history.length];
}
