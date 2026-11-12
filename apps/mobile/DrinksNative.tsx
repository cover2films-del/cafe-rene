import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Linking, AppState } from 'react-native';
import { Image } from 'expo-image';
import {
  drinkLibrary,
  drinkCategories,
  cocktailTastes,
  cocktailBases,
  mixologist,
  drinkFact,
} from '../../packages/shared/src/drinks';
import { money } from '../../packages/shared/src/index';
/* eslint-disable @typescript-eslint/no-require-imports -- Metro bundles static artwork. */
const art: Record<string, any> = {
  lager: require('../../packages/assets/drinks/lager.webp'),
  ale: require('../../packages/assets/drinks/ale.webp'),
  ipa: require('../../packages/assets/drinks/ipa.webp'),
  stout: require('../../packages/assets/drinks/stout.webp'),
  sour: require('../../packages/assets/drinks/sour.webp'),
  'zero-beer': require('../../packages/assets/drinks/zero-beer.webp'),
  mojito: require('../../packages/assets/drinks/mojito.webp'),
  negroni: require('../../packages/assets/drinks/negroni.webp'),
  margarita: require('../../packages/assets/drinks/margarita.webp'),
  espresso: require('../../packages/assets/drinks/espresso.webp'),
  'old-fashioned': require('../../packages/assets/drinks/old-fashioned.webp'),
  passionfruit: require('../../packages/assets/drinks/passionfruit.webp'),
  b52: require('../../packages/assets/drinks/b52.webp'),
  'baby-guinness': require('../../packages/assets/drinks/baby-guinness.webp'),
  'lemon-drop': require('../../packages/assets/drinks/lemon-drop.webp'),
  'mint-lime': require('../../packages/assets/drinks/mint-lime.webp'),
};
export function DrinksNative({ request, apiUrl }: { request: any; apiUrl: string }) {
  const [data, setData] = useState<any>({ drinks: drinkLibrary, updates: [], menus: [] }),
    [section, setSection] = useState('On tap'),
    [taste, setTaste] = useState('Any'),
    [base, setBase] = useState('Any'),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (AppState.currentState !== 'active') return;
      try {
        const r = await request('/drinks');
        if (active) {
          setData(r);
          setError('');
        }
      } catch {
        if (active) setError('Bar updates are unavailable. Ask the team for today’s selection.');
      }
    };
    void load();
    const timer = setInterval(() => void load(), 60000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load();
    });
    return () => {
      active = false;
      clearInterval(timer);
      sub.remove();
    };
  }, [request]);
  const chips = (values: readonly string[], value: string, set: (s: string) => void) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
      {values.map((v) => (
        <Pressable
          key={v}
          accessibilityRole="button"
          accessibilityState={{ selected: v === value }}
          style={[styles.chip, v === value && styles.selected]}
          onPress={() => set(v)}
        >
          <Text style={styles.body}>{v}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
  const picks =
    section === 'Mixologist'
      ? mixologist(data.drinks, taste, base)
      : data.drinks.filter((d: any) => d.category === section);
  return (
    <View>
      <Text style={styles.eyebrow}>FIND YOUR NEXT POUR</Text>
      <Text style={styles.heading}>At the bar.</Text>
      <Text style={styles.body}>
        {data.notice ||
          'Discover drink styles and recipes. Current taps, prices and ingredients are confirmed by the bar team.'}
      </Text>
      {chips([...drinkCategories, 'Mixologist'], section, setSection)}
      {section === 'Mixologist' && (
        <View style={styles.panel}>
          <Text style={styles.title}>What’s your flavour?</Text>
          <Text style={styles.body}>Choose a flavour and base for recipe inspiration.</Text>
          <Text style={styles.eyebrow}>FLAVOUR</Text>
          {chips(cocktailTastes, taste, setTaste)}
          <Text style={styles.eyebrow}>BASE</Text>
          {chips(cocktailBases, base, setBase)}
          <Text style={styles.small}>
            Recipes are inspiration, not a live stock list. Ask the team about allergens and the
            house serve.
          </Text>
        </View>
      )}
      {!!error && <Text style={styles.small}>{error}</Text>}
      {picks.map((d: any) => (
        <Drink key={d.id} drink={d} />
      ))}
      {!picks.length && <Text style={styles.body}>No matches. Try another flavour or base.</Text>}
      {!!data.updates.length && <Text style={styles.title}>Fresh from René’s bar</Text>}
      {data.updates.map((p: any) => (
        <View style={styles.panel} key={p.id}>
          {p.imageUrl && (
            <Image source={{ uri: apiUrl + p.imageUrl }} style={styles.photo} contentFit="cover" />
          )}
          <Text style={styles.body}>{p.text}</Text>
          <Pressable onPress={() => void Linking.openURL(p.url)}>
            <Text style={styles.link}>Read the original post ↗</Text>
          </Pressable>
        </View>
      ))}
      {data.menus.map((m: any) => (
        <Pressable key={m.url} onPress={() => void Linking.openURL(m.url)}>
          <Text style={styles.link}>{m.title} ↗</Text>
        </Pressable>
      ))}
    </View>
  );
}
function Drink({ drink: d }: { drink: any }) {
  const [expanded, setExpanded] = useState(false),
    [fact, setFact] = useState(Math.floor(Date.now() / 86400000) % d.history.length);
  return (
    <View style={styles.card}>
      <Image
        source={art[d.imageKey]}
        style={styles.photo}
        contentFit="cover"
        accessibilityLabel={'Illustration of ' + d.name}
      />
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>
          {d.category} · {d.taste}
        </Text>
        <Text style={styles.title}>{d.name}</Text>
        <Text style={styles.body}>{d.description}</Text>
        <Text style={styles.link}>
          {
            (
              {
                unconfirmed: 'Ask the team about today’s selection',
                available: 'On the bar board',
                limited: 'Limited selection',
                unavailable: 'Not pouring at the moment',
              } as any
            )[d.availability]
          }
        </Text>
        {d.availability !== 'unconfirmed' && d.price !== null && (
          <Text style={styles.title}>{money(d.price)}</Text>
        )}
        {d.alcohol && <Text style={styles.small}>Staff age check applies · no food points</Text>}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          style={styles.history}
          onPress={() => setExpanded((v) => !v)}
        >
          <Text style={styles.link}>A little drink history {expanded ? '−' : '+'}</Text>
        </Pressable>
        {expanded && (
          <View>
            <Text style={styles.body}>{drinkFact(d, fact)}</Text>
            <Pressable onPress={() => setFact((n) => n + 1)}>
              <Text style={styles.link}>Another fact ↻</Text>
            </Pressable>
            <Pressable onPress={() => void Linking.openURL(d.historyUrl)}>
              <Text style={styles.link}>Read more ↗</Text>
            </Pressable>
          </View>
        )}
        <Text style={styles.small}>
          Illustrative artwork · ask the team about ingredients and allergens.
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  heading: {
    fontFamily: 'RobotoSlab_700Bold',
    fontSize: 36,
    lineHeight: 46,
    color: '#fff8e8',
    marginBottom: 14,
  },
  title: {
    fontFamily: 'BreeSerif_400Regular',
    fontSize: 26,
    lineHeight: 34,
    color: '#fff8e8',
    marginVertical: 10,
  },
  body: { fontFamily: 'Roboto_400Regular', fontSize: 14, lineHeight: 22, color: '#d2e8e8' },
  small: { fontSize: 11, lineHeight: 18, color: '#bfd6de', marginVertical: 10 },
  eyebrow: { fontSize: 10, letterSpacing: 1, color: '#a2f4df', marginTop: 14 },
  chip: {
    padding: 12,
    minHeight: 44,
    marginRight: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#65d9cf66',
    justifyContent: 'center',
  },
  selected: { backgroundColor: '#146e68' },
  panel: { padding: 20, borderRadius: 20, backgroundColor: '#163649', marginBottom: 20 },
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#65d9cf55',
    backgroundColor: '#14364a',
    marginBottom: 24,
  },
  photo: { width: '100%', height: 260 },
  copy: { padding: 22 },
  link: { color: '#eeef9a', fontSize: 13, lineHeight: 21, marginVertical: 12 },
  history: { borderTopWidth: 1, borderTopColor: '#65d9cf44', marginTop: 10 },
});
