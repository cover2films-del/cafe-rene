import { useFonts } from 'expo-font';
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Image } from 'expo-image';
import { programmeSource, customerInterests } from '../../packages/shared/src/content';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  AppState,
  Switch,
  Share,
  KeyboardAvoidingView,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { money, type MenuItem, type BasketLine } from '../../packages/shared/src/index';
/* eslint-disable @typescript-eslint/no-require-imports -- Metro requires static paths for bundled images. */
const foodImages: Record<string, any> = {
  burger: require('../../packages/assets/food/burger.webp'),
  cod: require('../../packages/assets/food/cod.webp'),
  fries: require('../../packages/assets/food/fries.webp'),
  brownie: require('../../packages/assets/food/brownie.webp'),
  soup: require('../../packages/assets/food/soup.webp'),
};
const eventImages: Record<string, any> = {
  'nov26-alex-comaish': require('../../packages/assets/events/nov26-alex-comaish.webp'),
  'nov26-baron-crane': require('../../packages/assets/events/nov26-baron-crane.webp'),
  'nov26-st-fian': require('../../packages/assets/events/nov26-st-fian.webp'),
  'nov26-kayco': require('../../packages/assets/events/nov26-kayco.webp'),
  'nov26-luke-austin': require('../../packages/assets/events/nov26-luke-austin.webp'),
  'nov26-kingsley-allies': require('../../packages/assets/events/nov26-kingsley-allies.webp'),
};
/* eslint-enable @typescript-eslint/no-require-imports */
function eventImage(e: any) {
  return (
    eventImages[e.id] ||
    (e.imageUrl
      ? {
          uri:
            (process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl) + e.imageUrl,
        }
      : null)
  );
}
const config = Constants.expoConfig?.extra || {};
const apiUrl = process.env.EXPO_PUBLIC_API_URL || config.apiUrl;
const webUrl = process.env.EXPO_PUBLIC_WEB_URL || config.webUrl;
let sessionToken: string | null = null;
async function api(path: string, method = 'GET', body?: unknown, guest?: string) {
  const r = await fetch(apiUrl + '/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Native-Client': 'true',
      ...(sessionToken ? { Authorization: 'Bearer ' + sessionToken } : {}),
      ...(guest ? { 'X-Guest-Secret': guest } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || 'Request failed');
  return d;
}
const tabNames = ['Home', 'Order', 'What’s On', 'Rewards', 'My René'];
const tabIcons = ['⌂', '♧', '♫', '✦', '○'];
const clean = (s: string) => s.replaceAll('_', ' ');
export default function App() {
  const [loaded, error] = useFonts({ Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold });
  if (!loaded && !error)
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#141714', justifyContent: 'center' }}>
          <ActivityIndicator color="#d9bb83" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
function AppContent() {
  const [boot, setBoot] = useState<any>(null),
    [user, setUser] = useState<any>(null),
    [tab, setTab] = useState('Home'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [login, setLogin] = useState(false),
    [email, setEmail] = useState('customer@demo.rene'),
    [password, setPassword] = useState('ReneDemo2026!'),
    [register, setRegister] = useState(false),
    [name, setName] = useState(''),
    [table, setTable] = useState<any>(null),
    [collection, setCollection] = useState(false),
    [category, setCategory] = useState('All'),
    [query, setQuery] = useState(''),
    [basket, setBasket] = useState<BasketLine[]>([]),
    [item, setItem] = useState<MenuItem | null>(null),
    [mods, setMods] = useState<string[]>([]),
    [checkout, setCheckout] = useState(false),
    [notes, setNotes] = useState(''),
    [offer, setOffer] = useState(''),
    [order, setOrder] = useState<any>(null),
    [receipt, setReceipt] = useState<any>(null),
    [rewards, setRewards] = useState<any>(null),
    [scanner, setScanner] = useState(false),
    [permission, requestPermission] = useCameraPermissions(),
    [event, setEvent] = useState<any>(null),
    [genre, setGenre] = useState('All'),
    [booking, setBooking] = useState(false),
    [bookingDate, setBookingDate] = useState(''),
    [party, setParty] = useState('2'),
    [myOrders, setMyOrders] = useState<any[]>([]),
    [myBookings, setMyBookings] = useState<any>(null),
    [locationStatus, setLocationStatus] = useState(
      'Location is off. Use the rotating venue QR or ask staff.',
    ),
    [reduced, setReduced] = useState(false),
    [deleteConfirm, setDeleteConfirm] = useState('');
  const scanLock = useRef(false),
    watch = useRef<Location.LocationSubscription | null>(null),
    dwell = useRef<number | null>(null),
    scanHandler = useRef<(url: string) => Promise<void>>(async () => {}),
    receiptRef = useRef<any>(null);
  const run = async (fn: () => Promise<any>) => {
    setBusy(true);
    setError('');
    try {
      return await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const notify = (message: string) => Alert.alert('Café René', message);
  const stopLocation = () => {
    watch.current?.remove();
    watch.current = null;
    dwell.current = null;
  };
  const refresh = async () => {
    setBoot(await api('/bootstrap'));
    if (sessionToken) {
      try {
        setUser(await api('/me'));
        setRewards(await api('/rewards'));
      } catch {
        sessionToken = null;
        await SecureStore.deleteItemAsync('rene-session');
        setUser(null);
      }
    }
  };
  useEffect(() => {
    void run(async () => {
      sessionToken = await SecureStore.getItemAsync('rene-session');
      await refresh();
      const saved = await SecureStore.getItemAsync('rene-receipt');
      if (saved) {
        const r = JSON.parse(saved);
        receiptRef.current = r;
        setReceipt(r);
        setOrder(await api('/orders/' + r.id, 'GET', undefined, r.secret));
      }
      const initial = await Linking.getInitialURL();
      if (initial) await scanHandler.current(initial);
    });
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = Linking.addEventListener('url', (e) => void run(() => scanHandler.current(e.url)));
    const app = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        stopLocation();
        setLocationStatus('Location check stopped when the app left the foreground.');
      }
    });
    return () => {
      sub.remove();
      app.remove();
      stopLocation();
    };
  }, []);
  useEffect(() => {
    if (tab !== 'Rewards') {
      stopLocation();
    }
    if (user && tab === 'Rewards')
      api('/rewards')
        .then(setRewards)
        .catch(() => {});
    if (user && tab === 'My René') {
      api('/orders')
        .then(setMyOrders)
        .catch(() => {});
      api('/bookings')
        .then(setMyBookings)
        .catch(() => {});
    }
  }, [tab, user]);
  useEffect(() => {
    if (!order || ['completed', 'cancelled'].includes(order.status)) return;
    const timer = setInterval(() => {
      if (AppState.currentState !== 'active') return;
      api('/orders/' + order.id, 'GET', undefined, receiptRef.current?.secret)
        .then(setOrder)
        .catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, [order?.id, order?.status]);
  const handleScan = async (url: string) => {
    scanLock.current = true;
    setScanner(false);
    try {
      const parsed = Linking.parse(url);
      const q = parsed.queryParams;
      if (q?.table) {
        const ref = String(q.table);
        const t = await api('/table/validate', 'POST', { ref });
        setTable({ ref, ...t });
        setCollection(false);
        setTab('Order');
      } else {
        const ref = q?.ref ? String(q.ref) : url;
        if (!sessionToken) {
          notify('Sign in before verifying your visit.');
          setLogin(true);
          return;
        }
        setRewards(await api('/checkin', 'POST', { ref }));
        setTab('Rewards');
        notify(reduced ? 'Visit verified.' : '✦ Visit verified. Your René story is growing.');
      }
    } finally {
      scanLock.current = false;
    }
  };
  scanHandler.current = handleScan;
  async function signin() {
    await run(async () => {
      const d = await api(
        register ? '/auth/register' : '/auth/login',
        'POST',
        register ? { email, password, name } : { email, password },
      );
      sessionToken = d.token;
      await SecureStore.setItemAsync('rene-session', d.token);
      setUser(d.user);
      setRewards(await api('/rewards'));
      setLogin(false);
    });
  }
  async function chooseTable(n: number) {
    await run(async () => {
      setTable(await api('/demo/table/' + n));
      setCollection(false);
    });
  }
  const total = basket.reduce((s, l) => {
    const m = boot?.menu.find((x: MenuItem) => x.id === l.itemId);
    return (
      s +
      (m
        ? m.price +
          l.modifierIds.reduce(
            (s, id) => s + (m.modifiers.find((v: any) => v.id === id)?.price || 0),
            0,
          )
        : 0) *
        l.quantity
    );
  }, 0);
  async function placeOrder() {
    await run(async () => {
      const r = await api('/orders', 'POST', {
        items: basket,
        collection,
        ...(!collection && table ? { tableRef: table.ref } : {}),
        notes,
        ...(offer ? { offerId: offer } : {}),
        requestKey: Crypto.randomUUID(),
      });
      const receipt = { id: r.order.id, secret: r.guestSecret };
      await SecureStore.setItemAsync('rene-receipt', JSON.stringify(receipt));
      receiptRef.current = receipt;
      setReceipt(receipt);
      setOrder(r.order);
      setBasket([]);
      setCheckout(false);
      setTab('Order');
    });
  }
  async function locate() {
    await run(async () => {
      stopLocation();
      if (!user?.preferences.location) {
        setLocationStatus('Enable location-assisted arrival in My René first.');
        return;
      }
      const coords = boot.ordering.coordinates;
      if (!coords) {
        setLocationStatus(
          'Venue coordinates await manager verification. Use the venue QR or staff fallback.',
        );
        return;
      }
      const p = await Location.requestForegroundPermissionsAsync();
      if (p.status !== 'granted') {
        setLocationStatus('Permission denied. Use the rotating venue QR or ask staff.');
        return;
      }
      setLocationStatus('Checking proximity while this screen is open…');
      watch.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 0 },
        (pos) => {
          if (AppState.currentState !== 'active') {
            stopLocation();
            return;
          }
          const rad = (n: number) => (n * Math.PI) / 180;
          const a = rad(pos.coords.latitude - coords.latitude),
            b = rad(pos.coords.longitude - coords.longitude);
          const distance =
            6371000 *
            2 *
            Math.asin(
              Math.sqrt(
                Math.sin(a / 2) ** 2 +
                  Math.cos(rad(coords.latitude)) *
                    Math.cos(rad(pos.coords.latitude)) *
                    Math.sin(b / 2) ** 2,
              ),
            );
          if (pos.coords.accuracy == null || pos.coords.accuracy > boot.ordering.radius) {
            dwell.current = null;
            setLocationStatus('Location accuracy is too low. Use the venue QR or ask staff.');
            return;
          }
          if (distance <= boot.ordering.radius) {
            dwell.current ??= Date.now();
            const secs = Math.floor((Date.now() - dwell.current) / 1000);
            if (secs >= boot.ordering.dwellSeconds) {
              setLocationStatus(
                'You seem to be here. Scan the rotating venue QR to verify your visit.',
              );
              stopLocation();
            } else
              setLocationStatus(
                `Nearby. Confirming arrival: ${secs}/${boot.ordering.dwellSeconds}s. No visit credited yet.`,
              );
          } else {
            dwell.current = null;
            setLocationStatus('Not within the venue radius. No location is sent or retained.');
          }
        },
      );
    });
  }
  const button = (text: string, onPress: () => void, secondary = false, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={[s.button, secondary && s.secondary, (disabled || busy) && { opacity: 0.45 }]}
    >
      <Text style={[s.buttonText, secondary && { color: C.gold }]}>{text}</Text>
    </Pressable>
  );
  const heading = (eyebrow: string, title: string, sub?: string) => (
    <View style={{ marginBottom: 25 }}>
      <Text style={s.eyebrow}>{eyebrow}</Text>
      <Text style={s.heading}>{title}</Text>
      {sub && <Text style={s.body}>{sub}</Text>}
    </View>
  );
  const panel = (children: React.ReactNode) => <View style={s.panel}>{children}</View>;
  const openScan = async () => {
    if (!permission?.granted) {
      const p = await requestPermission();
      if (!p.granted) {
        notify('Camera permission denied. Select a demo table or ask staff to verify a visit.');
        return;
      }
    }
    scanLock.current = false;
    setScanner(true);
  };
  if (!boot)
    return (
      <SafeAreaView style={[s.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={s.wordmark}>Café René</Text>
        <ActivityIndicator color={C.gold} />
        <Text style={s.body}>{error || 'Getting ready for a good night…'}</Text>
        {error && button('Try again', () => void run(refresh))}
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <View style={s.demo}>
        <Text style={s.demoText}>PRIVATE DEMO · NO REAL PAYMENTS OR ORDERS</Text>
      </View>
      <View style={s.header}>
        <Pressable onPress={() => setTab('Home')} accessibilityRole="button">
          <Text style={s.wordmark}>Café René</Text>
          <Text style={s.wordmarkSub}>GLOUCESTER · EST. 2003</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open basket"
          onPress={() => setCheckout(true)}
          style={s.basketIcon}
        >
          <Text style={{ color: C.gold, fontSize: 17 }}>
            ♧ {basket.reduce((n, l) => n + l.quantity, 0)}
          </Text>
        </Pressable>
      </View>
      {error && (
        <View style={s.error}>
          <Text style={s.errorText}>{error}</Text>
          <Pressable onPress={() => setError('')} accessibilityLabel="Dismiss error">
            <Text style={s.errorText}>✕</Text>
          </Pressable>
        </View>
      )}
      {busy && (
        <ActivityIndicator
          style={{ position: 'absolute', right: 22, top: 65, zIndex: 5 }}
          color={C.gold}
        />
      )}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 35 }}>
        {tab === 'Home' && (
          <>
            <View style={s.hero}>
              <View style={s.heroLines} />
              <Text style={s.eyebrow}>IN THE HEART OF GLOUCESTER</Text>
              <Text style={s.heroTitle}>
                Good food.{'\n'}Live music.{'\n'}
                <Text style={{ color: C.gold }}>Great company.</Text>
              </Text>
              <Text style={[s.body, { marginVertical: 22 }]}>
                Your favourite corner of the city.{'\n'}Make yourself at home at René.
              </Text>
              {button('Order at my table  ↗', () => setTab('Order'))}
              {button('Find your next night  →', () => setTab('What’s On'), true)}
              <Text style={s.small}>31 Southgate Street · Independently spirited since 2003</Text>
            </View>
            <View style={s.content}>
              {heading('THE SOUND OF RENÉ', 'Find your kind of night.')}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 30 }}
              >
                {boot.events.map((e: any, i: number) => (
                  <Pressable
                    key={e.id}
                    style={[
                      s.eventCard,
                      {
                        backgroundColor: i % 2 ? '#442a31' : '#343c2c',
                        width: 260,
                        marginRight: 15,
                      },
                    ]}
                    onPress={() => setEvent(e)}
                  >
                    <Text style={s.eyebrow}>
                      {e.sample ? 'SAMPLE EVENT' : 'RENÉ LIVE'} · {e.genre.toUpperCase()}
                    </Text>
                    {eventImage(e) && (
                      <Image
                        source={eventImage(e)}
                        style={s.eventPhoto}
                        accessibilityLabel={e.title + ' original event artwork'}
                      />
                    )}
                    <Text style={[s.poster, { fontSize: 35 }]}>{e.title}</Text>
                    <Text style={s.small}>
                      {new Date(e.date).toLocaleDateString('en-GB', {
                        timeZone: 'Europe/London',
                        day: 'numeric',
                        month: 'long',
                      })}{' '}
                      · {e.sample ? 'Demo programme' : 'Official venue programme'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              {panel(
                <>
                  <Text style={s.eyebrow}>PULL UP A CHAIR</Text>
                  <Image
                    source={foodImages.burger}
                    style={s.featuredFood}
                    accessibilityLabel="Illustrative burger photography"
                  />
                  <Text style={s.title}>A proper appetite.{'\n'}A proper pub.</Text>
                  <Text style={s.body}>
                    From the Desperate Dan burger to comforting pub classics. Explore dishes
                    inspired by the official menu.
                  </Text>
                  {button('Explore the menu  →', () => setTab('Order'))}
                </>,
              )}
              {panel(
                <>
                  <Text style={s.eyebrow}>THE RENÉ CIRCLE</Text>
                  <Text style={s.title}>Good nights deserve good rewards.</Text>
                  <Text style={s.body}>Collect moments and become a René regular.</Text>
                  {button('Meet your rewards  ✦', () => setTab('Rewards'), true)}
                </>,
              )}
              {heading('COME ON OVER', 'Your corner of Gloucester.', boot.venue.address)}
              <Text style={s.body}>
                {boot.venue.hours}
                {'\n'}Kitchen: {boot.venue.foodHours}
              </Text>
              <Text style={s.small}>
                Hours await manager confirmation. A 24-hour licence is not 24-hour opening. Last
                entry Fri/Sat 1am.
              </Text>
              {button(
                'Directions  ↗',
                () =>
                  void Linking.openURL(
                    'https://maps.google.com/?q=Cafe+Rene+31+Southgate+Street+Gloucester',
                  ),
                true,
              )}
              {button('Book a table', () => setBooking(true), true)}
              {button('Call 01452 309340', () => void Linking.openURL('tel:01452309340'), true)}
              <Text style={s.small}>
                Food photography is illustrative, not a photograph of René’s actual dishes.
              </Text>
            </View>
          </>
        )}
        {tab === 'Order' && (
          <View style={s.content}>
            {heading(
              'GOOD FOOD, YOUR WAY',
              'The menu.',
              'Sample prices. No real food or payment is arranged.',
            )}
            {panel(
              <>
                <Text style={s.title}>
                  {collection ? 'Collect from the bar' : table?.label || 'Where are you sitting?'}
                </Text>
                {button('Scan table QR', () => void openScan(), true)}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <Pressable
                      key={i}
                      style={[
                        s.chip,
                        table?.label === `Table ${i + 1}` && !collection && s.selected,
                      ]}
                      onPress={() => void chooseTable(i + 1)}
                    >
                      <Text style={s.chipText}>Table {i + 1}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {button(
                  collection ? '✓ Collection selected' : 'Choose collection',
                  () => setCollection(true),
                  true,
                )}
              </>,
            )}
            {order &&
              panel(
                <>
                  <Text style={s.eyebrow}>DEMO ORDER #{order.id.slice(0, 8)}</Text>
                  <Text style={s.title}>{clean(order.status)}</Text>
                  <Text style={s.body}>
                    {money(order.total)} · Payment {order.payment}
                  </Text>
                  <Text style={s.small}>
                    {order.status === 'awaiting_acceptance'
                      ? 'Payment confirmed. Waiting for staff/POS acceptance.'
                      : 'Simulated order. No food will be prepared.'}
                  </Text>
                  {order.payment === 'unpaid' &&
                    order.status !== 'cancelled' &&
                    button(
                      'Simulate payment',
                      () =>
                        void run(async () => {
                          setOrder(
                            await api(
                              '/orders/' + order.id + '/mock-pay',
                              'POST',
                              {},
                              receipt?.secret,
                            ),
                          );
                        }),
                      false,
                    )}
                  {button(
                    'Share demo receipt',
                    () =>
                      void run(async () => {
                        const r = await api(
                          '/orders/' + order.id,
                          'GET',
                          undefined,
                          receipt?.secret,
                        );
                        await Share.share({
                          message: JSON.stringify(
                            {
                              id: r.id,
                              total: r.total,
                              payment: r.payment,
                              status: r.status,
                              items: r.items,
                            },
                            null,
                            2,
                          ),
                        });
                      }),
                    true,
                  )}
                  {order.payment === 'unpaid' &&
                    order.status !== 'cancelled' &&
                    button(
                      'Cancel unpaid order',
                      () =>
                        void run(async () => {
                          await api('/orders/' + order.id + '/cancel', 'POST', {}, receipt?.secret);
                          setOrder(
                            await api('/orders/' + order.id, 'GET', undefined, receipt?.secret),
                          );
                        }),
                      true,
                    )}
                </>,
              )}
            <TextInput
              style={s.input}
              placeholder="Find your favourite"
              placeholderTextColor={C.muted}
              value={query}
              onChangeText={setQuery}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginVertical: 15 }}
            >
              {['All', ...new Set<string>(boot.menu.map((m: MenuItem) => m.category))].map((c) => (
                <Pressable
                  key={c}
                  style={[s.chip, category === c && s.selected]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={s.chipText}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={s.warning}>
              Allergen data is unavailable. Ask staff before ordering. Source dietary labels await
              review.
            </Text>
            {boot.menu
              .filter(
                (m: MenuItem) =>
                  (category === 'All' || m.category === category) &&
                  m.name.toLowerCase().includes(query.toLowerCase()),
              )
              .map((m: MenuItem) => (
                <Pressable
                  key={m.id}
                  disabled={!m.available}
                  style={[s.menuCard, !m.available && { opacity: 0.4 }]}
                  onPress={() => {
                    setItem(m);
                    setMods([]);
                  }}
                >
                  {foodImages[m.id] && (
                    <View>
                      <Image
                        source={foodImages[m.id]}
                        style={s.menuPhoto}
                        accessibilityLabel={'Illustrative photo, not René’s actual dish'}
                      />
                      <Text style={s.photoLabel}>ILLUSTRATIVE</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.eyebrow}>
                      {m.category.toUpperCase()}
                      {m.alcohol ? ' · AGE CHECK' : ''}
                    </Text>
                    <Text style={s.menuTitle}>{m.name}</Text>
                    <Text style={s.body}>{m.description}</Text>
                    <Text style={s.small}>{m.dietary.join(' · ')}</Text>
                    <Text style={s.price}>
                      {money(m.price)} <Text style={s.small}>demo price</Text>
                    </Text>
                  </View>
                  <Text style={s.add}>+</Text>
                </Pressable>
              ))}
            {basket.length > 0 &&
              button(
                `View basket · ${basket.reduce((s, l) => s + l.quantity, 0)} items · ${money(total)}`,
                () => setCheckout(true),
              )}
          </View>
        )}
        {tab === 'What’s On' && (
          <View style={s.content}>
            {heading(
              'LIVE & IN GOOD COMPANY',
              'What’s on.',
              'From René’s official November calendar. Check with the venue for late changes.',
            )}
            <ScrollView horizontal style={{ marginBottom: 20 }}>
              {['All', ...new Set<string>(boot.events.map((e: any) => e.genre))].map((g) => (
                <Pressable
                  key={g}
                  style={[s.chip, genre === g && s.selected]}
                  onPress={() => setGenre(g)}
                >
                  <Text style={s.chipText}>{g}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {boot.events
              .filter((e: any) => genre === 'All' || genre === e.genre)
              .map((e: any, i: number) => (
                <Pressable
                  style={[
                    s.eventCard,
                    { backgroundColor: i % 2 ? '#442a31' : '#343c2c', marginBottom: 20 },
                  ]}
                  key={e.id}
                  onPress={() => setEvent(e)}
                >
                  <Text style={s.eyebrow}>
                    {e.sample ? 'SAMPLE' : 'OFFICIAL PROGRAMME'} · {e.genre.toUpperCase()}
                  </Text>
                  {eventImage(e) && (
                    <Image
                      source={eventImage(e)}
                      style={s.eventPhoto}
                      accessibilityLabel={e.title + ' original event artwork'}
                    />
                  )}
                  <Text style={s.poster}>{e.title}</Text>
                  <Text style={s.small}>
                    {new Date(e.date).toLocaleString('en-GB', { timeZone: 'Europe/London' })} ·{' '}
                    {e.sample ? 'Free demo entry' : e.free ? 'Free entry' : 'See event details'}
                  </Text>
                </Pressable>
              ))}
            {button(
              'Official Facebook listings ↗',
              () => void Linking.openURL(boot.venue.facebook),
              true,
            )}
            {button('Instagram ↗', () => void Linking.openURL(boot.venue.instagram), true)}
            <Text style={s.small}>
              Programme checked 11 November 2026 against the official venue calendar. Social posts
              require an authorised account connection; festival dates await confirmation.
            </Text>
            {button('Festival passport →', () => setTab('Rewards'), true)}
          </View>
        )}
        {tab === 'Rewards' && (
          <View style={s.content}>
            {heading(
              'MORE THAN A NIGHT OUT',
              'Your René story.',
              'Collect experiences. Get a little back.',
            )}
            {!user
              ? panel(
                  <>
                    <Text style={s.title}>Make yourself a regular.</Text>
                    {button('Sign in to rewards', () => setLogin(true))}
                  </>,
                )
              : rewards && (
                  <>
                    {panel(
                      <>
                        <Text style={s.eyebrow}>THE RENÉ CIRCLE · DEMO</Text>
                        <Text style={s.wordmark}>Café René</Text>
                        <Text style={s.body}>{user.name}</Text>
                        <Text style={[s.heading, { color: C.gold }]}>
                          {rewards.points} <Text style={s.small}>demo points</Text>
                        </Text>
                        <View
                          style={{
                            alignSelf: 'center',
                            padding: 12,
                            backgroundColor: C.cream,
                            marginBottom: 15,
                          }}
                        >
                          <QRCode
                            value={rewards.membership}
                            size={150}
                            backgroundColor={C.cream}
                            color={C.bg}
                          />
                        </View>
                        <Text style={s.small}>
                          Membership reference, not proof of age or arrival.
                        </Text>
                      </>,
                    )}
                    {panel(
                      <>
                        <Text style={s.title}>Here for a good time?</Text>
                        {button('Scan rotating venue QR', () => void openScan())}
                        {button('Check nearby · foreground only', () => void locate(), true)}
                        <Text style={s.body}>{locationStatus}</Text>
                        <Text style={s.small}>
                          One verified visit per London day. Location alone never credits rewards.
                          Precise location is neither uploaded nor retained.
                        </Text>
                      </>,
                    )}
                    {rewards.challenges.map((c: any) => (
                      <View key={c.id} style={s.challenge}>
                        <Text style={s.badge}>{c.progress >= c.target ? '✦' : c.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={s.menuTitle}>{c.name}</Text>
                          <Text style={s.body}>{c.description}</Text>
                          <View style={s.progress}>
                            <View
                              style={{
                                height: 4,
                                width: `${(c.progress / c.target) * 100}%`,
                                backgroundColor: C.gold,
                              }}
                            />
                          </View>
                          <Text style={s.small}>
                            {c.progress >= c.target
                              ? 'Achievement unlocked'
                              : `${c.progress} / ${c.target}`}
                          </Text>
                        </View>
                      </View>
                    ))}
                    <Text style={s.title}>A treat for next time.</Text>
                    {rewards.offers.map((o: any) => (
                      <View style={s.panel} key={o.id}>
                        <Text style={s.eyebrow}>SAMPLE OFFER · SINGLE USE</Text>
                        <Text style={s.title}>{o.name}</Text>
                        <Text style={s.body}>{o.description}</Text>
                        <Text style={s.small}>
                          Expires {new Date(o.expires).toLocaleDateString('en-GB')} · Food only
                        </Text>
                        {button(
                          o.eligible ? 'Use offer' : 'Unavailable',
                          () => {
                            setOffer(o.id);
                            setTab('Order');
                          },
                          true,
                          !o.eligible,
                        )}
                      </View>
                    ))}
                    <Text style={s.title}>Points history</Text>
                    {rewards.history.length ? (
                      rewards.history.map((h: any, i: number) => (
                        <Text style={s.body} key={i}>
                          {clean(h.reason)} · {h.points > 0 ? '+' : ''}
                          {h.points} pts
                        </Text>
                      ))
                    ) : (
                      <Text style={s.body}>
                        Your first completed eligible purchase starts your points story.
                      </Text>
                    )}
                  </>
                )}
          </View>
        )}
        {tab === 'My René' && (
          <View style={s.content}>
            {heading('YOUR LITTLE CORNER', 'My René.')}
            {!user ? (
              <>
                {button('Sign in / create account', () => setLogin(true))}
                <Text style={s.body}>Browsing and ordering are available as a guest.</Text>
              </>
            ) : (
              <>
                {panel(
                  <>
                    <Text style={s.title}>{user.name}</Text>
                    <Text style={s.body}>{user.role} · Demo account</Text>
                    {button(
                      'Sign out',
                      () =>
                        void run(async () => {
                          await api('/auth/logout', 'POST', {});
                          sessionToken = null;
                          await SecureStore.deleteItemAsync('rene-session');
                          setUser(null);
                          setRewards(null);
                          stopLocation();
                        }),
                      true,
                    )}
                  </>,
                )}
                {panel(
                  <>
                    <Text style={s.title}>Make it yours.</Text>
                    <Text style={s.body}>No marketing messages are sent in this demo.</Text>
                    {[
                      ['personalisation', 'Personalised recommendations'],
                      ['email', 'Email marketing'],
                      ['push', 'Push marketing'],
                      ['location', 'Location-assisted arrival'],
                    ].map(([key, label]) => (
                      <View style={s.switchRow} key={key}>
                        <Text style={[s.body, { flex: 1 }]}>{label}</Text>
                        <Switch
                          accessibilityLabel={label}
                          value={!!user.preferences[key]}
                          trackColor={{ true: C.red, false: '#474a3e' }}
                          onValueChange={(v) =>
                            void run(async () => {
                              setUser(
                                await api('/preferences', 'PUT', { ...user.preferences, [key]: v }),
                              );
                              if (key === 'location' && !v) stopLocation();
                            })
                          }
                        />
                      </View>
                    ))}
                    <Text style={s.eyebrow}>YOUR INTERESTS</Text>
                    <View style={s.wrap}>
                      {customerInterests.map((g) => (
                        <Pressable
                          key={g}
                          style={[s.chip, user.preferences.interests?.includes(g) && s.selected]}
                          onPress={() =>
                            void run(async () => {
                              const interests = user.preferences.interests.includes(g)
                                ? user.preferences.interests.filter((x: string) => x !== g)
                                : [...user.preferences.interests, g];
                              setUser(
                                await api('/preferences', 'PUT', {
                                  ...user.preferences,
                                  interests,
                                }),
                              );
                            })
                          }
                        >
                          <Text style={s.chipText}>{g}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>,
                )}
                {panel(
                  <>
                    <Text style={s.title}>Orders & receipts</Text>
                    {myOrders.map((o) => (
                      <Pressable
                        key={o.id}
                        style={s.listRow}
                        onPress={() =>
                          void run(async () => {
                            const r = await api('/orders/' + o.id);
                            await Share.share({ message: JSON.stringify(r, null, 2) });
                          })
                        }
                      >
                        <Text style={s.body}>
                          #{o.id.slice(0, 8)} · {clean(o.status)}
                        </Text>
                        <Text style={s.price}>{money(o.total)}</Text>
                      </Pressable>
                    ))}
                    {!myOrders.length && <Text style={s.body}>Nothing ordered just yet.</Text>}
                    {button(
                      'Link my guest receipt securely',
                      () =>
                        void run(async () => {
                          if (!receipt?.secret)
                            throw Error('No guest receipt found on this device.');
                          const r = await api(
                            '/orders/' + receipt.id + '/claim',
                            'POST',
                            {},
                            receipt.secret,
                          );
                          notify(r.message);
                          setMyOrders(await api('/orders'));
                        }),
                      true,
                    )}
                  </>,
                )}
                {panel(
                  <>
                    <Text style={s.title}>Bookings & tickets</Text>
                    {myBookings?.bookings.map((b: any) => (
                      <Text key={b.id} style={s.body}>
                        {new Date(b.data.date).toLocaleString('en-GB')} · {b.data.party} guests ·{' '}
                        {b.status}
                      </Text>
                    ))}
                    {myBookings?.tickets.map((t: any) => (
                      <View key={t.id}>
                        <Text style={s.body}>
                          Demo ticket · {t.event_id} · {t.used_at ? 'Used' : 'Not used'}
                        </Text>
                        <Text selectable style={s.small}>
                          {t.id}
                        </Text>
                      </View>
                    ))}
                    <Text style={s.small}>
                      Demo requests and tickets do not arrange real reservations or admission.
                    </Text>
                    {button('Request a table', () => setBooking(true), true)}
                  </>,
                )}
                {panel(
                  <>
                    <Text style={s.title}>Your data, your choice.</Text>
                    <Text style={s.body}>
                      Location stays on your device. No background tracking. Anonymised transaction
                      records are retained after deletion.
                    </Text>
                    {button(
                      'Export my data',
                      () =>
                        void run(async () => {
                          await Share.share({
                            message: JSON.stringify(await api('/privacy/export'), null, 2),
                          });
                        }),
                      true,
                    )}
                    <Text style={s.warning}>Delete account permanently: type DELETE below.</Text>
                    <TextInput
                      style={s.input}
                      value={deleteConfirm}
                      onChangeText={setDeleteConfirm}
                      placeholder="Type DELETE"
                      placeholderTextColor={C.muted}
                      autoCapitalize="characters"
                    />
                    {button(
                      'Delete my account',
                      () =>
                        Alert.alert(
                          'Delete account?',
                          'This permanently deletes account data and keeps anonymised transactions.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () =>
                                void run(async () => {
                                  await api('/privacy/account', 'DELETE', {
                                    confirm: deleteConfirm,
                                  });
                                  sessionToken = null;
                                  await SecureStore.deleteItemAsync('rene-session');
                                  setUser(null);
                                  setRewards(null);
                                  stopLocation();
                                }),
                            },
                          ],
                        ),
                      true,
                      deleteConfirm !== 'DELETE',
                    )}
                  </>,
                )}
                {['staff', 'manager', 'admin'].includes(user.role) &&
                  button(
                    'Open staff dashboard ↗',
                    () => void Linking.openURL(webUrl + '/staff'),
                    true,
                  )}
              </>
            )}
            <Text style={s.small}>
              Private demo. Source content, hours and menu prices await manager review. All payments
              and POS submissions are mocked.
            </Text>
          </View>
        )}
      </ScrollView>
      <SafeAreaView edges={['bottom']} style={s.tabSafe}>
        <View style={s.tabs}>
          {tabNames.map((t, i) => (
            <Pressable
              key={t}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
              onPress={() => setTab(t)}
              style={s.tab}
            >
              <Text style={[s.tabIcon, tab === t && { color: C.gold }]}>{tabIcons[i]}</Text>
              <Text style={[s.tabText, tab === t && { color: C.gold }]}>{t}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
      <Sheet
        visible={login}
        title={register ? 'Your René starts here.' : 'Welcome to René.'}
        close={() => setLogin(false)}
      >
        <Text style={s.body}>Seeded account: customer@demo.rene{`\n`}Password: ReneDemo2026!</Text>
        {register && (
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor={C.muted}
          />
        )}
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
        />
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password (12+ characters)"
          secureTextEntry
          autoCapitalize="none"
          textContentType={register ? 'newPassword' : 'password'}
        />
        {button(register ? 'Create account' : 'Sign in', () => void signin())}
        {button(
          register ? 'Already a regular? Sign in' : 'Create a demo account',
          () => setRegister(!register),
          true,
        )}
        {error && <Text style={s.warning}>{error}</Text>}
      </Sheet>
      <Sheet visible={!!item} title={item?.name || ''} close={() => setItem(null)}>
        {item && (
          <>
            <>
              {foodImages[item.id] && (
                <>
                  <Image
                    source={foodImages[item.id]}
                    style={s.featuredFood}
                    accessibilityLabel="Illustrative food photography"
                  />
                  <Text style={s.small}>Illustrative photography · actual dish may vary.</Text>
                </>
              )}
              <Text style={s.body}>{item.description}</Text>
            </>
            <Text style={s.warning}>
              Allergens unverified. Ask staff before ordering.{' '}
              {item.alcohol ? 'Staff age check required.' : ''}
            </Text>
            {item.modifiers.map((m) => (
              <View key={m.id} style={s.switchRow}>
                <Text style={s.body}>
                  {m.name} +{money(m.price)}
                </Text>
                <Switch
                  value={mods.includes(m.id)}
                  onValueChange={(v) =>
                    setMods(v ? [...mods, m.id] : mods.filter((id) => id !== m.id))
                  }
                />
              </View>
            ))}
            {button(
              'Add to basket · ' +
                money(
                  item.price +
                    item.modifiers
                      .filter((m) => mods.includes(m.id))
                      .reduce((s, m) => s + m.price, 0),
                ),
              () => {
                const copy = [...basket];
                const index = copy.findIndex(
                  (l) => l.itemId === item.id && l.modifierIds.join() === mods.join(),
                );
                if (index >= 0)
                  copy[index] = {
                    ...copy[index],
                    quantity: Math.min(20, copy[index].quantity + 1),
                  };
                else copy.push({ itemId: item.id, quantity: 1, modifierIds: mods });
                setBasket(copy);
                setItem(null);
              },
            )}
          </>
        )}
      </Sheet>
      <Sheet visible={checkout} title="Your basket." close={() => setCheckout(false)}>
        {basket.length ? (
          <>
            {basket.map((l, i) => {
              const m = boot.menu.find((m: MenuItem) => m.id === l.itemId);
              return (
                <View key={i} style={s.basketLine}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.menuTitle}>{m.name}</Text>
                    <Text style={s.small}>
                      {l.modifierIds
                        .map((id) => m.modifiers.find((m: any) => m.id === id)?.name)
                        .join(', ')}
                    </Text>
                    <Text style={s.price}>
                      {money(
                        (m.price +
                          l.modifierIds.reduce(
                            (n, id) => n + (m.modifiers.find((x: any) => x.id === id)?.price || 0),
                            0,
                          )) *
                          l.quantity,
                      )}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Remove one"
                    style={s.quantity}
                    onPress={() =>
                      setBasket((b) =>
                        b
                          .map((v, n) => (n === i ? { ...v, quantity: v.quantity - 1 } : v))
                          .filter((v) => v.quantity > 0),
                      )
                    }
                  >
                    <Text style={s.chipText}>−</Text>
                  </Pressable>
                  <Text style={s.body}>{l.quantity}</Text>
                  <Pressable
                    accessibilityLabel="Add one"
                    style={s.quantity}
                    onPress={() =>
                      setBasket((b) =>
                        b.map((v, n) =>
                          n === i ? { ...v, quantity: Math.min(20, v.quantity + 1) } : v,
                        ),
                      )
                    }
                  >
                    <Text style={s.chipText}>+</Text>
                  </Pressable>
                </View>
              );
            })}
            <TextInput
              style={[s.input, { minHeight: 85 }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={500}
              placeholder="Kitchen notes. Speak to staff about allergies."
              placeholderTextColor={C.muted}
            />
            <Text style={s.body}>
              {collection ? 'Collection' : table?.label || 'Select a table in Order'} · Subtotal{' '}
              {money(total)}
            </Text>
            {rewards?.offers
              .filter((o: any) => o.eligible)
              .map((o: any) => (
                <Pressable
                  key={o.id}
                  style={[s.chip, offer === o.id && s.selected]}
                  onPress={() => setOffer(offer === o.id ? '' : o.id)}
                >
                  <Text style={s.chipText}>
                    {offer === o.id ? '✓ ' : ''}
                    {o.name}
                  </Text>
                </Pressable>
              ))}
            <Text style={s.warning}>
              Server validates prices, table, availability and discounts. Simulation only.
              Connection required.
            </Text>
            {button('Create demo order', () => void placeOrder(), false, !collection && !table)}
            {!user && (
              <Text style={s.small}>
                Guest receipt secret is stored securely on this device. Optional account creation is
                available after purchase.
              </Text>
            )}
          </>
        ) : (
          <Text style={s.body}>Your basket has room for something good.</Text>
        )}
        {error && <Text style={s.warning}>{error}</Text>}
      </Sheet>
      <Sheet visible={!!event} title={event?.title || ''} close={() => setEvent(null)}>
        {event && (
          <>
            <Text style={s.eyebrow}>
              {event.sample ? 'SAMPLE EVENT' : 'OFFICIAL VENUE PROGRAMME'} · {event.genre}
            </Text>
            {eventImage(event) && (
              <Image
                source={eventImage(event)}
                style={s.eventDetailPhoto}
                accessibilityLabel={event.title + ' original event artwork'}
              />
            )}
            <Text style={s.body}>
              {new Date(event.date).toLocaleString('en-GB', { timeZone: 'Europe/London' })}
            </Text>
            <Text style={s.body}>{event.description}</Text>
            <Text style={s.warning}>
              {event.sample
                ? 'Sample listing. Demo tickets do not grant real admission.'
                : 'From the official venue programme; check the source for changes.'}{' '}
              Reminder preferences are stored; delivery is not connected.
            </Text>
            {button(
              'Save & remind me',
              () =>
                user
                  ? void run(async () =>
                      notify(
                        (await api('/favourites/' + event.id, 'POST', { reminder: true })).message,
                      ),
                    )
                  : (setEvent(null), setLogin(true)),
              true,
            )}
            {!event.sample &&
              button(
                'Official event information ↗',
                () => void Linking.openURL(event.sourceUrl || programmeSource),
              )}
            {event.sample &&
              button('Save demo ticket', () =>
                user
                  ? void run(async () =>
                      notify((await api('/tickets/' + event.id, 'POST', {})).message),
                    )
                  : (setEvent(null), setLogin(true)),
              )}
          </>
        )}
      </Sheet>
      <Sheet visible={booking} title="A table for your people." close={() => setBooking(false)}>
        <Text style={s.body}>Demo request only. Call 01452 309340 for a real reservation.</Text>
        <Text style={s.small}>
          Date/time with timezone, for example 2026-12-10T19:00:00Z. UK winter = UTC; summer =
          UTC+1.
        </Text>
        <TextInput
          style={s.input}
          value={bookingDate}
          onChangeText={setBookingDate}
          autoCapitalize="none"
          placeholder="2026-12-10T19:00:00Z"
          placeholderTextColor={C.muted}
        />
        <TextInput
          style={s.input}
          value={party}
          onChangeText={setParty}
          keyboardType="number-pad"
          placeholder="Party size"
        />
        {button(user ? 'Make demo request' : 'Sign in to request', () => {
          if (!user) {
            setBooking(false);
            setLogin(true);
            return;
          }
          void run(async () => {
            const date = new Date(bookingDate);
            if (Number.isNaN(date.getTime())) throw Error('Enter a valid date and timezone.');
            notify(
              (
                await api('/bookings', 'POST', {
                  date: date.toISOString(),
                  party: Number(party),
                  notes: '',
                })
              ).message,
            );
            setBooking(false);
          });
        })}
        {error && <Text style={s.warning}>{error}</Text>}
      </Sheet>
      <Modal
        visible={scanner}
        animationType={reduced ? 'none' : 'slide'}
        onRequestClose={() => setScanner(false)}
      >
        <SafeAreaView style={s.safe}>
          <Text style={[s.title, { padding: 20 }]}>Scan a René QR</Text>
          {scanner && permission?.granted && (
            <CameraView
              style={{ flex: 1 }}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => {
                if (!scanLock.current) void run(() => handleScan(data));
              }}
            />
          )}
          {button('Close scanner', () => setScanner(false), true)}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
function Sheet({
  visible,
  title,
  close,
  children,
}: {
  visible: boolean;
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <KeyboardAvoidingView
        style={s.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={s.sheet}>
          <View style={s.sheetHead}>
            <Text style={[s.title, { flex: 1, margin: 0 }]}>{title}</Text>
            <Pressable accessibilityLabel="Close dialog" onPress={close} style={{ padding: 12 }}>
              <Text style={{ color: C.cream, fontSize: 22 }}>✕</Text>
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 25 }}
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const C = {
  bg: '#141714',
  panel: '#20261f',
  cream: '#f1eadd',
  muted: '#acae9b',
  gold: '#d9b875',
  red: '#a73d4d',
  line: '#45483a',
};
const s = StyleSheet.create({
  menuPhoto: { width: 95, height: 150, borderRadius: 8 },
  photoLabel: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 5,
    color: '#d9bb83',
    marginTop: 7,
    textAlign: 'center',
    letterSpacing: 1,
  },
  featuredFood: { width: '100%', height: 195, borderRadius: 10, marginBottom: 18 },
  eventPhoto: { width: '100%', height: 150, borderRadius: 8, marginBottom: 16 },
  eventDetailPhoto: { width: '100%', height: 220, borderRadius: 10, marginBottom: 20 },

  safe: { flex: 1, backgroundColor: C.bg },
  demo: { backgroundColor: '#30251f', padding: 7, alignItems: 'center' },
  demoText: { fontFamily: 'Manrope_400Regular', fontSize: 8, color: C.gold, letterSpacing: 1 },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff15',
  },
  wordmark: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 34,
    fontStyle: 'italic',
    color: C.cream,
  },
  wordmarkSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 6,
    color: C.gold,
    letterSpacing: 2.5,
    marginTop: 3,
  },
  basketIcon: { borderWidth: 1, borderColor: C.line, padding: 12, borderRadius: 10 },
  hero: {
    paddingHorizontal: 26,
    paddingTop: 45,
    paddingBottom: 28,
    backgroundColor: '#222c1e',
    overflow: 'hidden',
  },
  heroLines: {
    position: 'absolute',
    height: 450,
    width: 450,
    right: -200,
    top: 20,
    borderWidth: 45,
    borderColor: '#a88f3a12',
    borderRadius: 230,
    transform: [{ rotate: '-20deg' }],
  },
  heroTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 46,
    lineHeight: 56,
    color: C.cream,
    letterSpacing: -2,
  },
  eyebrow: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 8,
    letterSpacing: 1.7,
    color: C.gold,
    fontWeight: '600',
    marginBottom: 15,
  },
  heading: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 36,
    lineHeight: 46,
    color: C.cream,
    marginBottom: 14,
    letterSpacing: -0.7,
  },
  title: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 27,
    lineHeight: 34,
    color: C.cream,
    marginBottom: 14,
  },
  body: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 20,
    color: '#bfc1ae',
    marginBottom: 12,
  },
  small: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 9,
    lineHeight: 16,
    color: C.muted,
    marginVertical: 10,
  },
  button: {
    backgroundColor: C.red,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginVertical: 7,
  },
  secondary: { backgroundColor: '#ffffff04', borderWidth: 1, borderColor: '#cab47d44' },
  buttonText: {
    fontFamily: 'Manrope_600SemiBold',
    color: C.cream,
    fontSize: 12,
    fontWeight: '600',
  },
  content: { padding: 24 },
  panel: {
    backgroundColor: C.panel,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cab47d25',
    marginBottom: 22,
  },
  eventCard: {
    padding: 25,
    borderWidth: 1,
    borderColor: '#d2b77433',
    borderRadius: 10,
    minHeight: 210,
    justifyContent: 'space-between',
  },
  poster: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 36,
    color: '#e9dfb8',
    lineHeight: 45,
    marginVertical: 20,
  },
  tabs: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10, paddingBottom: 10 },
  tabSafe: { backgroundColor: '#20221b', borderTopWidth: 1, borderTopColor: '#d2b77444' },
  tab: { alignItems: 'center', gap: 4, minWidth: 58, minHeight: 43 },
  tabIcon: { fontFamily: 'Manrope_400Regular', fontSize: 24, color: '#8f9981' },
  tabText: { fontFamily: 'Manrope_400Regular', fontSize: 8, color: '#9da58f' },
  input: {
    fontFamily: 'Manrope_400Regular',
    backgroundColor: '#1a1d16',
    borderColor: '#cabb8c44',
    borderWidth: 1,
    padding: 14,
    color: C.cream,
    borderRadius: 3,
    fontSize: 12,
    marginVertical: 8,
    minHeight: 45,
  },
  chip: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#cabb8c2a',
    borderRadius: 3,
    marginRight: 8,
    marginVertical: 4,
    minHeight: 40,
    justifyContent: 'center',
  },
  selected: { backgroundColor: '#d6b27620', borderColor: '#d6b27688' },
  chipText: { fontFamily: 'Manrope_400Regular', fontSize: 10, color: C.gold },
  warning: {
    fontFamily: 'Manrope_400Regular',
    color: '#d4ba8e',
    fontSize: 10,
    lineHeight: 18,
    backgroundColor: '#8a603c16',
    padding: 13,
    marginVertical: 10,
  },
  menuCard: {
    backgroundColor: '#24271d',
    padding: 20,
    borderWidth: 1,
    borderColor: '#cabb8c20',
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: 'row',
    gap: 18,
    alignItems: 'center',
  },
  menuTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 21,
    lineHeight: 26,
    color: C.cream,
    marginBottom: 9,
  },
  price: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: C.gold, marginTop: 8 },
  add: {
    fontFamily: 'Manrope_400Regular',
    color: C.gold,
    fontSize: 26,
    borderWidth: 1,
    borderColor: '#cabb8c55',
    width: 36,
    height: 36,
    textAlign: 'center',
    lineHeight: 34,
    borderRadius: 3,
  },
  error: {
    backgroundColor: '#592b32',
    padding: 15,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  errorText: { fontFamily: 'Manrope_400Regular', color: '#ffe0da', fontSize: 11, flexShrink: 1 },
  challenge: {
    padding: 20,
    borderWidth: 1,
    borderColor: '#cabb8c2a',
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
    backgroundColor: C.panel,
  },
  badge: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 33,
    color: C.gold,
    width: 45,
    textAlign: 'center',
  },
  progress: { height: 4, backgroundColor: '#ffffff15', marginVertical: 5, width: '100%' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 15,
    marginVertical: 8,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  listRow: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#cabb8c20' },
  backdrop: { flex: 1, backgroundColor: '#000b', justifyContent: 'center', padding: 18 },
  sheet: {
    backgroundColor: '#26281f',
    maxHeight: '90%',
    padding: 22,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cab47d55',
  },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 10 },
  basketLine: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#cabb8c30',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quantity: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#cabb8c30',
    minWidth: 40,
    alignItems: 'center',
  },
});
