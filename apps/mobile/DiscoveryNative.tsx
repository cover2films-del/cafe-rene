import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch, StyleSheet, AppState } from 'react-native';
import { Image } from 'expo-image';
import { foodTastes } from '../../packages/shared/src/tastes';
import { money } from '../../packages/shared/src/index';
export function DiscoveryNative({
  user,
  setUser,
  request,
  run,
  onSelect,
  images,
  barImage,
}: {
  user: any;
  setUser: any;
  request: any;
  run: any;
  onSelect: (id: string) => void;
  images: Record<string, any>;
  barImage: any;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  const [tastes, setTastes] = useState<string[]>(user.preferences.tastes || []),
    [enabled, setEnabled] = useState(!!user.preferences.personalisation);
  useEffect(() => {
    setTastes(user.preferences.tastes || []);
    setEnabled(!!user.preferences.personalisation);
  }, [user.preferences]);
  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    const load = async () => {
      if (AppState.currentState !== 'active') return;
      try {
        const result = await request('/my-rene/discovery');
        if (active) {
          setData(result);
          setError('');
        }
      } catch {
        if (active) setError('Your favourites could not load. Please try again.');
      }
    };
    void load();
    const timer = setInterval(() => void load(), 60000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load();
    });
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [user.id, user.preferences, revision, request]);
  const cards = (items: any[]) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
      {items.map((item) => (
        <View style={styles.card} key={item.id}>
          <Image
            source={item.imageKey === 'venue-bar' ? barImage : images[item.imageKey]}
            style={styles.photo}
            contentFit="cover"
            accessibilityLabel={
              item.imageKey === 'venue-bar'
                ? 'The Café René bar'
                : 'AI illustration of ' + item.name
            }
          />
          <View style={styles.copy}>
            <Text style={styles.eyebrow}>{item.category}</Text>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.body}>{item.reason}</Text>
            {item.price !== null && <Text style={styles.price}>{money(item.price)}</Text>}
            {item.alcohol && (
              <Text style={styles.small}>Staff age verification required · no food points</Text>
            )}
            {item.orderable ? (
              <Pressable
                accessibilityRole="button"
                style={styles.button}
                onPress={() => onSelect(item.id)}
              >
                <Text style={styles.buttonText}>View dish ↗</Text>
              </Pressable>
            ) : (
              <Text style={styles.small}>Ask at the bar · selection and prices vary</Text>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
  return (
    <View style={{ marginVertical: 26 }}>
      <Text style={styles.eyebrow}>YOUR TASTE OF RENÉ</Text>
      <Text style={styles.heading}>Find your next favourite.</Text>
      <View style={styles.controls}>
        <Image
          source={images.club}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.08 }]}
          contentFit="cover"
          accessible={false}
        />
        <Text style={styles.name}>What do you enjoy?</Text>
        <View style={styles.wrap}>
          {foodTastes.map((taste) => (
            <Pressable
              key={taste}
              accessibilityRole="button"
              accessibilityState={{ selected: tastes.includes(taste) }}
              style={[styles.chip, tastes.includes(taste) && styles.selected]}
              onPress={() =>
                setTastes((current) =>
                  current.includes(taste)
                    ? current.filter((t) => t !== taste)
                    : [...current, taste],
                )
              }
            >
              <Text style={styles.body}>{taste}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.switchRow}>
          <Text style={[styles.body, { flex: 1 }]}>
            Use my tastes and completed order history for suggestions
          </Text>
          <Switch
            accessibilityLabel="Personalised food and drink suggestions"
            value={enabled}
            onValueChange={setEnabled}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={() =>
            void run(async () =>
              setUser(
                await request('/preferences', 'PUT', {
                  ...user.preferences,
                  tastes,
                  personalisation: enabled,
                }),
              ),
            )
          }
        >
          <Text style={styles.buttonText}>Save my tastes</Text>
        </Pressable>
        <Text style={styles.small}>
          Personalisation is optional. Turning it off shows general picks. Preferences are not an
          allergen declaration.
        </Text>
      </View>
      {error && (
        <>
          <Text accessibilityRole="alert" style={styles.body}>
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={styles.button}
            onPress={() => setRevision((n) => n + 1)}
          >
            <Text style={styles.buttonText}>Retry</Text>
          </Pressable>
        </>
      )}
      {!data && !error && <Text style={styles.body}>Finding your favourites…</Text>}
      {data && (
        <>
          <Text style={styles.title}>
            {data.personalised ? 'Picked for you' : 'Something to try'}
          </Text>
          {cards(data.suggestions)}
          <Text style={styles.title}>Popular plates</Text>
          {cards(data.popular)}
          <Text style={styles.title}>Popular drinks</Text>
          {cards(data.drinks)}
          <Text style={styles.small}>{data.note}</Text>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  controls: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#63ddcc44',
    backgroundColor: '#163448',
    overflow: 'hidden',
    marginVertical: 20,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#63ddcc55',
  },
  selected: { backgroundColor: '#136e68', borderColor: '#72e7d5' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 10 },
  card: {
    width: 242,
    marginRight: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#63ddcc44',
    backgroundColor: '#153447',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: 180 },
  copy: { padding: 18, flex: 1 },
  heading: {
    fontFamily: 'RobotoSlab_700Bold',
    fontSize: 30,
    lineHeight: 40,
    color: '#fff8e8',
    marginVertical: 8,
  },
  title: {
    fontFamily: 'BreeSerif_400Regular',
    fontSize: 25,
    lineHeight: 33,
    color: '#fff8e8',
    marginBottom: 14,
  },
  name: {
    fontFamily: 'BreeSerif_400Regular',
    fontSize: 22,
    lineHeight: 30,
    color: '#fff8e8',
    marginBottom: 10,
  },
  eyebrow: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 10,
    letterSpacing: 1,
    color: '#83e5df',
    marginBottom: 8,
  },
  body: { fontFamily: 'Roboto_400Regular', fontSize: 13, lineHeight: 20, color: '#d2e8e8' },
  small: {
    fontFamily: 'Roboto_400Regular',
    fontSize: 11,
    lineHeight: 18,
    color: '#bdd6de',
    marginVertical: 8,
  },
  price: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 22,
    lineHeight: 30,
    color: '#f0ed80',
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#b92760',
    padding: 14,
    borderRadius: 10,
    minHeight: 48,
    marginVertical: 10,
  },
  buttonText: { fontFamily: 'Roboto_700Bold', fontSize: 13, color: '#fff8e8', textAlign: 'center' },
});
