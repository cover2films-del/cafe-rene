import { DiscoveryNative } from './DiscoveryNative';
import Svg, { Path } from 'react-native-svg';
import { socialIconPaths } from '../../packages/shared/src/social-icons';
import { menuSources, seasonalMenu, menuChecked } from '../../packages/shared/src/venue-menu';
import { CircleNative } from './CircleNative';
import { useFonts } from 'expo-font';
import { Roboto_400Regular } from '@expo-google-fonts/roboto/400Regular';
import { RobotoSlab_700Bold } from '@expo-google-fonts/roboto-slab/700Bold';
import { Roboto_700Bold } from '@expo-google-fonts/roboto/700Bold';
import { BreeSerif_400Regular } from '@expo-google-fonts/bree-serif/400Regular';
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
  Animated,
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
  soup: require('../../packages/assets/food/generated/soup.webp'),
  'garlic-mushrooms': require('../../packages/assets/food/generated/garlic-mushrooms.webp'),
  goujons: require('../../packages/assets/food/generated/goujons.webp'),
  whitebait: require('../../packages/assets/food/generated/whitebait.webp'),
  'pork-bites': require('../../packages/assets/food/generated/pork-bites.webp'),
  'loaded-fries': require('../../packages/assets/food/generated/loaded-fries.webp'),
  'dirty-fries': require('../../packages/assets/food/generated/dirty-fries.webp'),
  'loaded-garlic': require('../../packages/assets/food/generated/loaded-garlic.webp'),
  'cajun-wrap': require('../../packages/assets/food/generated/cajun-wrap.webp'),
  'brie-bacon': require('../../packages/assets/food/generated/brie-bacon.webp'),
  'ham-cheddar': require('../../packages/assets/food/generated/ham-cheddar.webp'),
  'fish-fingers': require('../../packages/assets/food/generated/fish-fingers.webp'),
  tuna: require('../../packages/assets/food/generated/tuna.webp'),
  avocado: require('../../packages/assets/food/generated/avocado.webp'),
  falafel: require('../../packages/assets/food/generated/falafel.webp'),
  club: require('../../packages/assets/food/generated/club.webp'),
  beef: require('../../packages/assets/food/generated/beef.webp'),
  tarragon: require('../../packages/assets/food/generated/tarragon.webp'),
  cod: require('../../packages/assets/food/generated/cod.webp'),
  sausage: require('../../packages/assets/food/generated/sausage.webp'),
  chilli: require('../../packages/assets/food/generated/chilli.webp'),
  curry: require('../../packages/assets/food/generated/curry.webp'),
  lasagne: require('../../packages/assets/food/generated/lasagne.webp'),
  'squid-scampi': require('../../packages/assets/food/generated/squid-scampi.webp'),
  'earth-bowl': require('../../packages/assets/food/generated/earth-bowl.webp'),
  'steak-pie': require('../../packages/assets/food/generated/steak-pie.webp'),
  burger: require('../../packages/assets/food/generated/burger.webp'),
  'very-dan': require('../../packages/assets/food/generated/very-dan.webp'),
  'chicken-burger': require('../../packages/assets/food/generated/chicken-burger.webp'),
  veggie: require('../../packages/assets/food/generated/veggie.webp'),
  rump: require('../../packages/assets/food/generated/rump.webp'),
  gammon: require('../../packages/assets/food/generated/gammon.webp'),
  'pork-loin': require('../../packages/assets/food/generated/pork-loin.webp'),
  'grilled-chicken': require('../../packages/assets/food/generated/grilled-chicken.webp'),
  chips: require('../../packages/assets/food/generated/chips.webp'),
  fries: require('../../packages/assets/food/generated/fries.webp'),
  'onion-rings': require('../../packages/assets/food/generated/onion-rings.webp'),
  'cheesy-garlic': require('../../packages/assets/food/generated/cheesy-garlic.webp'),
  icecream: require('../../packages/assets/food/generated/icecream.webp'),
  crumble: require('../../packages/assets/food/generated/crumble.webp'),
  toffee: require('../../packages/assets/food/generated/toffee.webp'),
  brownie: require('../../packages/assets/food/generated/brownie.webp'),
  cheesecake: require('../../packages/assets/food/generated/cheesecake.webp'),
  cheeseboard: require('../../packages/assets/food/generated/cheeseboard.webp'),
  'roast-beef': require('../../packages/assets/food/generated/roast-beef.webp'),
  turkey: require('../../packages/assets/food/generated/turkey.webp'),
  prawn: require('../../packages/assets/food/generated/prawn.webp'),
  breakfast: require('../../packages/assets/food/generated/breakfast.webp'),
  mash: require('../../packages/assets/food/generated/mash.webp'),
  'new-potatoes': require('../../packages/assets/food/generated/new-potatoes.webp'),
  'garlic-bread': require('../../packages/assets/food/generated/garlic-bread.webp'),
  vegetables: require('../../packages/assets/food/generated/vegetables.webp'),
  olives: require('../../packages/assets/food/generated/olives.webp'),
  'cheesy-chips': require('../../packages/assets/food/generated/cheesy-chips.webp'),
  'side-salad': require('../../packages/assets/food/generated/side-salad.webp'),
  mozzarella: require('../../packages/assets/food/generated/mozzarella.webp'),
  'veggie-breakfast': require('../../packages/assets/food/generated/veggie-breakfast.webp'),
  'breakfast-bap': require('../../packages/assets/food/generated/breakfast-bap.webp'),
  'roast-pork': require('../../packages/assets/food/generated/roast-pork.webp'),
  wellington: require('../../packages/assets/food/generated/wellington.webp'),
  salmon: require('../../packages/assets/food/generated/salmon.webp'),
  caesar: require('../../packages/assets/food/generated/caesar.webp'),
  'roast-potatoes': require('../../packages/assets/food/generated/roast-potatoes.webp'),
  yorkshire: require('../../packages/assets/food/generated/yorkshire.webp'),
  cauliflower: require('../../packages/assets/food/generated/cauliflower.webp'),
  'tomato-soup': require('../../packages/assets/food/generated/tomato-soup.webp'),
  parfait: require('../../packages/assets/food/generated/parfait.webp'),
  arancini: require('../../packages/assets/food/generated/arancini.webp'),
  brisket: require('../../packages/assets/food/generated/brisket.webp'),
  'christmas-pudding': require('../../packages/assets/food/generated/christmas-pudding.webp'),
  'winter-cheesecake': require('../../packages/assets/food/generated/winter-cheesecake.webp'),
  'chocolate-tart': require('../../packages/assets/food/generated/chocolate-tart.webp'),
  dippers: require('../../packages/assets/food/generated/dippers.webp'),
  'croque-garlic': require('../../packages/assets/food/generated/croque-garlic.webp'),
  'chicken-pie': require('../../packages/assets/food/generated/chicken-pie.webp'),
  'mushroom-pie': require('../../packages/assets/food/generated/mushroom-pie.webp'),
  'kids-fish': require('../../packages/assets/food/generated/kids-fish.webp'),
  'kids-sausage': require('../../packages/assets/food/generated/kids-sausage.webp'),
  'kids-chicken': require('../../packages/assets/food/generated/kids-chicken.webp'),
  sirloin: require('../../packages/assets/food/generated/sirloin.webp'),
};
const eventImages: Record<string, any> = {
  'nov26-alex-comaish': require('../../packages/assets/events/nov26-alex-comaish.webp'),
  'nov26-baron-crane': require('../../packages/assets/events/nov26-baron-crane.webp'),
  'nov26-st-fian': require('../../packages/assets/events/nov26-st-fian.webp'),
  'nov26-kayco': require('../../packages/assets/events/nov26-kayco.webp'),
  'nov26-luke-austin': require('../../packages/assets/events/nov26-luke-austin.webp'),
  'nov26-kingsley-allies': require('../../packages/assets/events/nov26-kingsley-allies.webp'),
};
const officialLogo = require('../../packages/assets/brand/logo.png');
const venueInterior = require('../../packages/assets/brand/venue-interior.webp');
const officialPoster = require('../../packages/assets/brand/november-2026.webp');
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
const clean = (s: string) => s.replaceAll('_', ' ');
export default function App() {
  const [loaded, error] = useFonts({
    Roboto_400Regular,
    RobotoSlab_700Bold,
    Roboto_700Bold,
    BreeSerif_400Regular,
  });
  if (!loaded && !error)
    return (
      <SafeAreaProvider>
        <StartupScreen />
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
    [user, updateUser] = useState<any>(null),
    [tab, setTab] = useState('Home'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [login, setLogin] = useState(false),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [register, setRegister] = useState(false),
    [name, setName] = useState(''),
    [table, setTable] = useState<any>(null),
    [collection, setCollection] = useState(false),
    [category, setCategory] = useState('All'),
    [menuEdition, setMenuEdition] = useState('main'),
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
    [myHistory, setMyHistory] = useState<any>(null),
    [myBookings, setMyBookings] = useState<any>(null),
    [locationStatus, setLocationStatus] = useState(
      'Location is off. Use the rotating venue QR or ask staff.',
    ),
    [reduced, setReduced] = useState(false),
    [deleteConfirm, setDeleteConfirm] = useState('');
  const identity = useRef<string | null>(null);
  const setUser = (next: any) => {
    identity.current = next?.id || null;
    if (next?.id !== user?.id) {
      setRewards(null);
      setMyOrders([]);
      setMyHistory(null);
      setMyBookings(null);
      if (order?.user_id && order.user_id !== next?.id) setOrder(null);
    }
    updateUser(next);
  };
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
  useEffect(() => {
    const timer = setInterval(() => {
      if (AppState.currentState === 'active')
        api('/bootstrap')
          .then(setBoot)
          .catch(() => {});
    }, 60000);
    return () => clearInterval(timer);
  }, []);
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
      api('/history')
        .then((value) => {
          if (identity.current === user.id) setMyHistory(value);
        })
        .catch(() => {});
      api('/orders')
        .then((value) => {
          if (identity.current === user.id) setMyOrders(value);
        })
        .catch(() => {});
      api('/bookings')
        .then((value) => {
          if (identity.current === user.id) setMyBookings(value);
        })
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
      <View
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }}
      >
        {/facebook/i.test(text) && <NativeSocialLogo platform="facebook" />}
        {/instagram/i.test(text) && <NativeSocialLogo platform="instagram" />}
        <Text style={[s.buttonText, secondary && { color: C.gold }, { flexShrink: 1 }]}>
          {text}
        </Text>
      </View>
    </Pressable>
  );
  const heading = (eyebrow: string, title: string, sub?: string) => (
    <View style={{ marginBottom: 25 }}>
      <Text style={s.eyebrow}>{eyebrow}</Text>
      <Text style={s.heading}>{title}</Text>
      {sub && <Text style={s.body}>{sub}</Text>}
    </View>
  );
  const panel = (children: React.ReactNode) => (
    <View style={s.panel}>
      <Image
        source={
          tab === 'Order'
            ? foodImages.club
            : tab === 'What’s On'
              ? eventImages['nov26-baron-crane']
              : venueInterior
        }
        style={[StyleSheet.absoluteFillObject, { opacity: 0.1 }]}
        contentFit="cover"
        accessible={false}
      />
      {children}
    </View>
  );
  const openScan = async () => {
    if (!permission?.granted) {
      const p = await requestPermission();
      if (!p.granted) {
        notify('Camera permission denied. Select your table or ask staff to verify a visit.');
        return;
      }
    }
    scanLock.current = false;
    setScanner(true);
  };
  if (!boot)
    return (
      <StartupScreen
        message={error || undefined}
        retry={error ? () => void run(refresh) : undefined}
      />
    );
  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <Image
        source={
          tab === 'Order'
            ? foodImages.club
            : tab === 'What’s On'
              ? eventImages['nov26-baron-crane']
              : tab === 'Rewards'
                ? foodImages.burger
                : venueInterior
        }
        style={[StyleSheet.absoluteFillObject, { opacity: 0.12 }]}
        contentFit="cover"
        accessible={false}
        pointerEvents="none"
      />
      <StatusBar style="light" />
      <View style={s.demo}>
        <Text style={s.demoText}>FOOD · LIVE MUSIC · GOOD COMPANY</Text>
      </View>
      <View style={s.header}>
        <Pressable
          onPress={() => setTab('Home')}
          accessibilityRole="button"
          style={{ flex: 1, marginRight: 12 }}
        >
          <AnimatedLogo
            source={boot.content?.logo?.id ? { uri: apiUrl + boot.content.logo.url } : officialLogo}
          />
          <Text style={s.wordmarkSub}>GLOUCESTER · EST. 2003</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open basket"
          onPress={() => setCheckout(true)}
          style={s.basketIcon}
        >
          <NativeNavIcon name="Basket" color="#15388e" />
          <Text style={{ color: '#15388e', fontSize: 14, fontFamily: 'Roboto_700Bold' }}>
            {basket.reduce((n, l) => n + l.quantity, 0)}
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
      <MotionScroll
        key={tab}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 35 }}
      >
        {tab === 'Home' && (
          <>
            <View style={s.hero}>
              <Image
                source={venueInterior}
                style={[StyleSheet.absoluteFillObject, { opacity: 0.23 }]}
                contentFit="cover"
                accessible={false}
              />
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
              <Text style={s.eyebrow}>MAKE IT A RENÉ KIND OF DAY</Text>
              <Text style={s.heading}>Find your food. Your music. Your people.</Text>
              <View style={s.experienceGrid}>
                {[
                  {
                    target: 'Order',
                    title: 'Pull up a chair.',
                    detail: 'Explore the menu',
                    image: foodImages.burger,
                  },
                  {
                    target: 'What’s On',
                    title: 'Find your night.',
                    detail: 'See what’s on',
                    image: boot.events[0] ? eventImage(boot.events[0]) : officialPoster,
                  },
                  {
                    target: 'Rewards',
                    title: 'Be a regular.',
                    detail: 'Points & treats',
                    image: foodImages.club,
                  },
                  {
                    target: 'My René',
                    title: 'Bring your people.',
                    detail: 'Groups & plans',
                    image: venueInterior,
                  },
                ].map((card) => (
                  <Pressable
                    key={card.target}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      s.experienceCard,
                      pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                    ]}
                    onPress={() => setTab(card.target)}
                  >
                    <Image
                      source={card.image}
                      style={StyleSheet.absoluteFillObject}
                      contentFit="cover"
                      accessible={false}
                    />
                    <View
                      style={[
                        StyleSheet.absoluteFillObject,
                        { backgroundColor: '#041322', opacity: 0.55 },
                      ]}
                    />
                    <View style={s.experienceIcon}>
                      <NativeNavIcon name={card.target} color="#a2fff0" />
                    </View>
                    <View>
                      <Text style={s.experienceTitle}>{card.title}</Text>
                      <Text style={s.experienceDetail}>{card.detail} ↗</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
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
                    <NativeEventBackdrop event={e} />
                    <Text style={s.eyebrow}>
                      {e.sample ? 'SAMPLE EVENT' : 'RENÉ LIVE'} · {e.genre.toUpperCase()}
                    </Text>
                    <NativeEventArtwork event={e} />
                    <Text style={[s.poster, { fontSize: 35 }]}>{e.title}</Text>
                    <Text style={s.small}>
                      {new Date(e.date).toLocaleDateString('en-GB', {
                        timeZone: 'Europe/London',
                        day: 'numeric',
                        month: 'long',
                      })}{' '}
                      · {e.sample ? 'Programme preview' : 'Official venue programme'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <NativeVenueBoard content={boot.content} />
              {panel(
                <>
                  <Text style={s.eyebrow}>PULL UP A CHAIR</Text>
                  <Image
                    source={foodImages.burger}
                    style={s.featuredFood}
                    accessibilityLabel="AI-generated burger illustration"
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
              <Text style={s.small}>Food images are illustrations; actual dishes may vary.</Text>
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
                  <Text style={s.eyebrow}>ORDER PREVIEW #{order.id.slice(0, 8)}</Text>
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
                    'Share receipt',
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
              style={{ marginBottom: 16 }}
            >
              {menuSources.map((source) => (
                <Pressable
                  key={source.id}
                  style={[s.chip, menuEdition === source.id && s.selected]}
                  onPress={() => {
                    setMenuEdition(source.id);
                    setCategory('All');
                  }}
                >
                  <Text style={s.chipText}>{source.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={s.body}>
              {menuSources.find((source) => source.id === menuEdition)?.note}
            </Text>
            {button(
              'Read original menu ↗',
              () =>
                void Linking.openURL(menuSources.find((source) => source.id === menuEdition)!.url),
              true,
            )}
            <Text style={s.small}>
              Published menu checked {menuChecked}. Ask the team about availability and allergens.
              Meal deals are arranged with staff.
            </Text>
            {['festive', 'christmas-day', 'christmas-children'].includes(menuEdition) &&
              seasonalMenu(menuEdition).map((dish) => (
                <View key={dish.name} style={s.panel}>
                  <Image
                    source={foodImages[dish.imageKey]}
                    style={s.featuredFood}
                    contentFit="cover"
                    accessibilityLabel={'AI illustration of ' + dish.name}
                  />
                  <Text style={s.eyebrow}>{dish.course}</Text>
                  <Text style={s.title}>{dish.name}</Text>
                  <Text style={s.body}>{dish.description}</Text>
                  <Text style={s.small}>Included in the set menu · AI illustration</Text>
                </View>
              ))}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginVertical: 15 }}
            >
              {[
                'All',
                ...new Set<string>(
                  boot.menu
                    .filter((m: MenuItem) => (m.menuEdition || 'main') === menuEdition)
                    .map((m: MenuItem) => m.category),
                ),
              ].map((c) => (
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
                  (m.menuEdition || 'main') === menuEdition &&
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
                  {foodImages[m.imageKey || m.id] && (
                    <View>
                      <Image
                        source={foodImages[m.imageKey || m.id]}
                        style={s.menuPhoto}
                        accessibilityLabel={
                          'AI-generated illustration, not a photograph of René’s actual dish'
                        }
                      />
                      <Text style={s.photoLabel}>AI ILLUSTRATION</Text>
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
                      {money(m.price)} <Text style={s.small}>published price</Text>
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
              'Official artwork and fresh posts from René. Check the source for late changes.',
            )}
            <NativeVenueBoard content={boot.content} />
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
                  <NativeEventBackdrop event={e} />
                  <Text style={s.eyebrow}>
                    {e.sample ? 'SAMPLE' : 'OFFICIAL PROGRAMME'} · {e.genre.toUpperCase()}
                  </Text>
                  <NativeEventArtwork event={e} />
                  <Text style={s.poster}>{e.title}</Text>
                  <Text style={s.small}>
                    {new Date(e.date).toLocaleString('en-GB', { timeZone: 'Europe/London' })} ·{' '}
                    {e.sample ? 'Entry information' : e.free ? 'Free entry' : 'See event details'}
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
            {user && <NativeSnapshot rewards={rewards} />}
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
                        <Image
                          source={venueInterior}
                          style={StyleSheet.absoluteFillObject}
                          contentFit="cover"
                          accessible={false}
                        />
                        <View
                          style={[
                            StyleSheet.absoluteFillObject,
                            { backgroundColor: '#073b53', opacity: 0.94 },
                          ]}
                        />
                        <Text style={s.eyebrow}>THE RENÉ CIRCLE ✦ YOUR LOCAL, YOUR PEOPLE</Text>
                        <Image
                          source={officialLogo}
                          style={{
                            width: '100%',
                            height: 150,
                            marginBottom: 20,
                            transform: [{ rotate: '-2deg' }],
                            backgroundColor: '#faf7ed',
                            borderRadius: 5,
                          }}
                          contentFit="contain"
                          accessibilityLabel="Café René Gloucester"
                        />
                        <Text style={s.body}>{user.name}</Text>
                        <Text style={[s.heading, { color: C.gold }]}>
                          {rewards.points} <Text style={s.small}>René Points · member balance</Text>
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
                        <Image
                          source={
                            c.id === 'menu'
                              ? foodImages.club
                              : c.id === 'music'
                                ? eventImages['nov26-baron-crane']
                                : c.id === 'festival'
                                  ? officialPoster
                                  : venueInterior
                          }
                          style={[StyleSheet.absoluteFillObject, { opacity: 0.17 }]}
                          contentFit="cover"
                          accessible={false}
                        />
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
            {user?.id !== 'daniel' &&
              button(
                'Explore Daniel Woolf’s René',
                () =>
                  void run(async () => {
                    const d = await api('/auth/login', 'POST', {
                      email: 'daniel@demo.rene',
                      password: 'ReneDemo2026!',
                    });
                    sessionToken = d.token;
                    await SecureStore.setItemAsync('rene-session', d.token);
                    setUser(d.user);
                    setRewards(await api('/rewards'));
                  }),
              )}
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
                    <Text style={s.body}>{user.role} · Member account</Text>
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
                    <Text style={s.body}>
                      Your preferences are saved. Marketing delivery is not connected.
                    </Text>
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
                                await api('/preferences', 'PUT', {
                                  ...user.preferences,
                                  [key]: v,
                                }),
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
                <NativeSnapshot rewards={rewards} />
                <DiscoveryNative
                  key={'picks-' + user.id}
                  user={user}
                  setUser={setUser}
                  request={api}
                  run={run}
                  images={foodImages}
                  barImage={venueInterior}
                  onSelect={(id) => {
                    const dish = boot.menu.find((m: MenuItem) => m.id === id);
                    if (dish?.available) {
                      setTab('Order');
                      setMods([]);
                      setItem(dish);
                    }
                  }}
                />
                <CircleNative key={user.id} user={user} api={api} run={run} />
                {panel(
                  <>
                    <Text style={s.title}>What you ate & drank</Text>
                    <Text style={s.small}>Sample history — these are not actual purchases.</Text>
                    {myHistory?.orders.map((o: any) => (
                      <View key={o.id} style={s.listRow}>
                        <Text style={s.price}>
                          {new Date(o.created_at).toLocaleDateString('en-GB', {
                            timeZone: 'Europe/London',
                          })}{' '}
                          · {money(o.total)}
                        </Text>
                        {o.items.map((i: any) => (
                          <Text key={i.id} style={s.body}>
                            {i.quantity} × {i.name}
                          </Text>
                        ))}
                      </View>
                    ))}
                    <Text style={[s.title, { marginTop: 25 }]}>Orders & receipts</Text>
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
                          Example ticket · {t.event_id} · {t.used_at ? 'Used' : 'Not used'}
                        </Text>
                        <Text selectable style={s.small}>
                          {t.id}
                        </Text>
                      </View>
                    ))}
                    <Text style={s.small}>
                      Requests and saved event information do not confirm reservations or admission.
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
              Menu availability is confirmed by the team. Payments and till submission are not
              connected.
            </Text>
          </View>
        )}
      </MotionScroll>
      <SafeAreaView edges={['bottom']} style={s.tabSafe}>
        <View style={s.tabs}>
          {tabNames.map((t) => (
            <Pressable
              key={t}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
              onPress={() => setTab(t)}
              style={({ pressed }) => [
                s.tab,
                tab === t && { backgroundColor: '#1c847446' },
                pressed && { opacity: 0.7 },
              ]}
            >
              <NativeNavIcon name={t} color={tab === t ? '#eeef93' : '#a9c4d1'} />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[s.tabText, tab === t && { color: C.gold }]}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
      <Sheet
        visible={login}
        title={register ? 'Your René starts here.' : 'Welcome to René.'}
        close={() => setLogin(false)}
      >
        <Text style={s.body}>
          Sign in to your René Circle, or explore Daniel’s sample account from My René.
        </Text>
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
          register ? 'Already a regular? Sign in' : 'Create an account',
          () => setRegister(!register),
          true,
        )}
        {error && <Text style={s.warning}>{error}</Text>}
      </Sheet>
      <Sheet visible={!!item} title={item?.name || ''} close={() => setItem(null)}>
        {item && (
          <>
            <>
              {foodImages[item.imageKey || item.id] && (
                <>
                  <Image
                    source={foodImages[item.imageKey || item.id]}
                    style={s.featuredFood}
                    accessibilityLabel="AI-generated dish illustration"
                  />
                  <Text style={s.small}>AI-generated illustration · actual dish may vary.</Text>
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
            {button('Preview order', () => void placeOrder(), false, !collection && !table)}
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
                accessibilityLabel={event.title + ' official venue graphic'}
              />
            )}
            <Text style={s.body}>
              {new Date(event.date).toLocaleString('en-GB', { timeZone: 'Europe/London' })}
            </Text>
            <Text style={s.body}>{event.description}</Text>
            <Text style={s.warning}>
              {event.sample
                ? 'Sample listing. Example tickets do not grant real admission.'
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
              button('Save example ticket', () =>
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
        <Text style={s.body}>Call 01452 309340 to confirm your reservation.</Text>
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
        {button(user ? 'Request a table' : 'Sign in to request', () => {
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
function NativeSnapshot({ rewards }: { rewards: any }) {
  if (!rewards) return null;
  return (
    <View style={{ marginBottom: 24 }}>
      <View style={[s.panel, { backgroundColor: '#28325a', overflow: 'hidden', borderRadius: 20 }]}>
        <Image
          source={foodImages.brownie}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.1 }]}
          contentFit="cover"
          accessible={false}
        />
        <Text style={s.eyebrow}>YOUR RENÉ POINTS</Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          accessibilityLabel={rewards.points + ' René Points'}
          style={[
            s.heading,
            { fontSize: 64, lineHeight: 82, paddingTop: 4, marginBottom: 8, color: '#f0ed80' },
          ]}
        >
          {Number(rewards.points).toLocaleString('en-GB')}
        </Text>
        <Text style={s.title}>René Points</Text>
        <Text style={s.small}>
          Food purchases and sample welcome rewards. No points for alcohol spending.
        </Text>
      </View>
      <View style={[s.panel, { backgroundColor: '#e9ed7c' }]}>
        <Image
          source={foodImages.soup}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.06 }]}
          contentFit="cover"
          accessible={false}
        />
        <Text style={[s.title, { color: '#17485b' }]}>The Kitchen Club</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                aspectRatio: 1,
                maxWidth: 38,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#166555',
                backgroundColor: i < (rewards.stampCard?.stamps || 0) ? '#167a68' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  color: i < (rewards.stampCard?.stamps || 0) ? '#f6f5ba' : '#3d6d72',
                }}
              >
                {i < (rewards.stampCard?.stamps || 0) ? '✦' : i + 1}
              </Text>
            </View>
          ))}
        </View>
        <Text style={[s.body, { color: '#184e5b' }]}>
          {rewards.stampCard?.stamps || 0} / 6 separate food-visit days. Collect all six for £5 off
          eligible food.
        </Text>
        <Text style={[s.small, { color: '#3c6971' }]}>
          Sample promotion. Drinks don’t earn food stamps. Eligibility is checked at checkout.
        </Text>
      </View>
    </View>
  );
}

function NativeVenueBoard({ content }: { content: any }) {
  const posters = content?.programmes || [
    { id: 'fallback-nov26', url: '/programme/november-2026.webp' },
  ];
  return (
    <View style={{ marginBottom: 30 }}>
      <Text style={s.eyebrow}>THE RENÉ NOTICEBOARD</Text>
      <Text style={s.title}>Fresh off the wall.</Text>
      {posters.map((p: any) => (
        <Pressable
          key={p.id}
          onPress={() => void Linking.openURL(apiUrl + p.url)}
          style={{
            marginBottom: 20,
            borderWidth: 3,
            borderColor: '#03c6a6',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          <Image
            source={p.id === 'fallback-nov26' ? officialPoster : { uri: apiUrl + p.url }}
            style={{ width: '100%', aspectRatio: 1200 / 1689 }}
            contentFit="contain"
            accessibilityLabel="Café René official What’s On artwork"
          />
          <Text style={[s.small, { paddingHorizontal: 15, color: '#c8fff0' }]}>
            Tap to open the full programme ↗
          </Text>
        </Pressable>
      ))}
      {content?.posts?.map((p: any) => (
        <View
          key={p.id}
          style={[s.panel, { borderColor: p.platform === 'instagram' ? '#e74f9a' : '#05c5ec' }]}
        >
          <NativeSocialLogo platform={p.platform === 'instagram' ? 'instagram' : 'facebook'} />
          <Text style={s.eyebrow}>
            {p.platform === 'instagram' ? 'INSTAGRAM' : 'FACEBOOK'} · CAFÉ RENÉ
          </Text>
          {p.imageUrl && (
            <Image
              source={{ uri: apiUrl + p.imageUrl }}
              style={s.featuredFood}
              contentFit="cover"
            />
          )}
          <Text style={s.body}>{p.text}</Text>
          <Pressable onPress={() => void Linking.openURL(p.url)}>
            <Text style={{ color: '#eff181', fontSize: 12 }}>View original post ↗</Text>
          </Pressable>
        </View>
      ))}
      {!content?.posts?.length && (
        <View style={[s.panel, { backgroundColor: '#652768' }]}>
          <Text style={s.title}>Don’t miss a beat.</Text>
          <Text style={s.body}>Follow the nights, the music and what’s happening at René.</Text>
          <Pressable
            style={[s.button, { flexDirection: 'row', gap: 10 }]}
            onPress={() => void Linking.openURL('https://www.instagram.com/cafereneglos/')}
          >
            <NativeSocialLogo platform="instagram" />
            <Text style={s.buttonText}>Follow @cafereneglos ↗</Text>
          </Pressable>
          <Pressable
            style={[s.button, { backgroundColor: '#194fba', flexDirection: 'row', gap: 10 }]}
            onPress={() => void Linking.openURL('https://www.facebook.com/thecaferene')}
          >
            <NativeSocialLogo platform="facebook" />
            <Text style={s.buttonText}>Café René on Facebook ↗</Text>
          </Pressable>
        </View>
      )}
      <Text style={s.small}>
        {content?.checkedAt
          ? 'Website checked ' +
            new Date(content.checkedAt).toLocaleString('en-GB', { timeZone: 'Europe/London' })
          : 'Official venue programme'}{' '}
        · Updates while the server is awake.
      </Text>
    </View>
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
  bg: '#0d1728',
  panel: '#162b40',
  cream: '#f1eadd',
  muted: '#acae9b',
  gold: '#e9ed76',
  red: '#e83476',
  line: '#45483a',
};
const s = StyleSheet.create({
  menuPhoto: { width: 100, height: 145, borderRadius: 14 },
  photoLabel: {
    fontFamily: 'Roboto_400Regular',
    fontSize: 8,
    color: '#b5d5dd',
    marginTop: 7,
    textAlign: 'center',
    letterSpacing: 1,
  },
  featuredFood: { width: '100%', height: 195, borderRadius: 10, marginBottom: 18 },
  eventPhoto: { width: '100%', height: 150, borderRadius: 8, marginBottom: 16 },
  eventDetailPhoto: { width: '100%', height: 220, borderRadius: 10, marginBottom: 20 },

  safe: { flex: 1, backgroundColor: C.bg },
  demo: { backgroundColor: '#30251f', padding: 7, alignItems: 'center' },
  demoText: { fontFamily: 'Roboto_400Regular', fontSize: 8, color: C.gold, letterSpacing: 1 },
  header: {
    backgroundColor: '#faf7ed',
    paddingHorizontal: 24,
    paddingVertical: 8,
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
    color: '#14358d',
    fontFamily: 'Roboto_400Regular',
    fontSize: 6,

    letterSpacing: 2.5,
    marginTop: 3,
  },
  basketIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: '#2763ab55',
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#d8e7ef',
  },
  hero: {
    paddingHorizontal: 26,
    paddingTop: 45,
    paddingBottom: 28,
    backgroundColor: '#0d3b4a',
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
    fontFamily: 'RobotoSlab_700Bold',
    fontSize: 46,
    lineHeight: 56,
    color: C.cream,
    letterSpacing: -2,
  },
  eyebrow: {
    fontFamily: 'Roboto_400Regular',
    fontSize: 8,
    letterSpacing: 1.7,
    color: C.gold,
    fontWeight: '600',
    marginBottom: 15,
  },
  heading: {
    fontFamily: 'RobotoSlab_700Bold',
    fontSize: 36,
    lineHeight: 46,
    color: C.cream,
    marginBottom: 14,
    letterSpacing: -0.7,
  },
  title: {
    fontFamily: 'RobotoSlab_700Bold',
    fontSize: 27,
    lineHeight: 34,
    color: C.cream,
    marginBottom: 14,
  },
  body: {
    fontFamily: 'Roboto_400Regular',
    fontSize: 12,
    lineHeight: 20,
    color: '#bfc1ae',
    marginBottom: 12,
  },
  small: {
    fontFamily: 'Roboto_400Regular',
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
    fontFamily: 'Roboto_700Bold',
    color: C.cream,
    fontSize: 12,
    fontWeight: '600',
  },
  content: { padding: 24 },
  panel: {
    overflow: 'hidden',
    backgroundColor: C.panel,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cab47d25',
    marginBottom: 22,
  },
  eventCard: {
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d2b77433',
    borderRadius: 10,
    minHeight: 210,
    justifyContent: 'space-between',
  },
  poster: {
    fontFamily: 'RobotoSlab_700Bold',
    fontSize: 36,
    color: '#e9dfb8',
    lineHeight: 45,
    marginVertical: 20,
  },
  tabs: { flexDirection: 'row', justifyContent: 'space-around', padding: 8, gap: 3 },
  tabSafe: { backgroundColor: '#0c2336', borderTopWidth: 1, borderTopColor: '#52d5d54d' },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 16,
    minHeight: 58,
  },
  tabIcon: { fontFamily: 'Roboto_400Regular', fontSize: 24, color: '#8f9981' },
  tabText: { fontFamily: 'Roboto_700Bold', fontSize: 10, color: '#a9c4d1' },
  input: {
    fontFamily: 'Roboto_400Regular',
    backgroundColor: '#1a1d16',
    borderColor: '#cabb8c44',
    borderWidth: 1,
    padding: 14,
    color: C.cream,
    borderRadius: 12,
    fontSize: 14,
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
  chipText: { fontFamily: 'Roboto_400Regular', fontSize: 10, color: C.gold },
  warning: {
    fontFamily: 'Roboto_400Regular',
    color: '#d4ba8e',
    fontSize: 10,
    lineHeight: 18,
    backgroundColor: '#8a603c16',
    padding: 13,
    marginVertical: 10,
  },
  menuCard: {
    backgroundColor: '#14384b',
    padding: 16,
    borderWidth: 1,
    borderColor: '#65d9cf44',
    borderRadius: 20,
    marginBottom: 15,
    flexDirection: 'row',
    gap: 18,
    alignItems: 'center',
  },
  experienceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 34 },
  experienceCard: {
    flexGrow: 1,
    flexBasis: '46%',
    minHeight: 210,
    borderRadius: 22,
    padding: 17,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#70e7d555',
  },
  experienceIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d354a99',
    borderWidth: 1,
    borderColor: '#a3fff044',
  },
  experienceTitle: {
    fontFamily: 'BreeSerif_400Regular',
    fontSize: 25,
    lineHeight: 31,
    color: '#fff9ed',
    marginBottom: 8,
  },
  experienceDetail: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 11,
    lineHeight: 17,
    color: '#b8ffec',
  },
  menuTitle: {
    fontFamily: 'RobotoSlab_700Bold',
    fontSize: 21,
    lineHeight: 26,
    color: C.cream,
    marginBottom: 9,
  },
  price: { fontFamily: 'RobotoSlab_700Bold', fontSize: 14, color: C.gold, marginTop: 8 },
  add: {
    fontFamily: 'Roboto_400Regular',
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
  errorText: { fontFamily: 'Roboto_400Regular', color: '#ffe0da', fontSize: 11, flexShrink: 1 },
  challenge: {
    overflow: 'hidden',
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
    fontFamily: 'Roboto_400Regular',
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

function NativeSocialLogo({ platform }: { platform: 'facebook' | 'instagram' }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" accessible={false}>
      <Path d={socialIconPaths[platform]} fill="#ffffff" />
    </Svg>
  );
}
function NativeEventArtwork({ event }: { event: any }) {
  const source = eventImage(event);
  if (!source) return null;
  return (
    <View
      style={{
        width: '100%',
        aspectRatio: 1.15,
        overflow: 'hidden',
        borderRadius: 12,
        marginBottom: 16,
      }}
    >
      <Image
        source={source}
        style={StyleSheet.absoluteFillObject}
        contentFit="contain"
        accessibilityLabel={event.title + ' official programme artwork'}
      />
    </View>
  );
}

function useMotionPreference() {
  const [reduce, setReduce] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduce(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduce;
}
function AnimatedLogo({
  source = officialLogo,
  startup = false,
}: {
  source?: any;
  startup?: boolean;
}) {
  const reduce = useMotionPreference();
  const glow = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    if (reduce) {
      glow.setValue(0.2);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 0.6,
          duration: 3000,
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(glow, {
          toValue: 0.2,
          duration: 3000,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [reduce, glow]);
  return (
    <View
      style={{
        width: startup ? 215 : 254,
        maxWidth: '100%',
        height: startup ? 100 : 108,
        justifyContent: 'center',
        backgroundColor: startup ? '#faf7ed' : 'transparent',
        borderRadius: 18,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 14,
          right: 14,
          top: 24,
          bottom: 20,
          borderRadius: 40,
          backgroundColor: '#3976e7',
          opacity: glow,
          shadowColor: '#2363d4',
          shadowOpacity: 0.8,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
      <Image
        source={source}
        style={{ width: '100%', height: '100%' }}
        contentFit="contain"
        accessibilityLabel="Café René Gloucester"
      />
    </View>
  );
}
function useArrivalProgress() {
  const reduce = useMotionPreference();
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduce) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [reduce, progress]);
  return progress;
}
function MotionScroll({ style, ...props }: React.ComponentProps<typeof ScrollView>) {
  const progress = useArrivalProgress();
  return (
    <Animated.ScrollView
      {...props}
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
          ],
        },
      ]}
    />
  );
}
function MotionModule({ children }: { children: React.ReactNode }) {
  const progress = useArrivalProgress();
  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
function StartupScreen({ message, retry }: { message?: string; retry?: () => void }) {
  return (
    <SafeAreaView style={[s.safe, { justifyContent: 'center', alignItems: 'center', padding: 30 }]}>
      <Image
        source={venueInterior}
        style={[StyleSheet.absoluteFillObject, { opacity: 0.14 }]}
        contentFit="cover"
        accessible={false}
      />
      <MotionModule>
        <AnimatedLogo startup />
      </MotionModule>
      <View style={{ paddingTop: 30, gap: 20, alignItems: 'center' }}>
        <ActivityIndicator color="#66dfed" />
        <Text
          accessibilityRole="text"
          style={{ color: '#d5e9ee', textAlign: 'center', fontSize: 14 }}
        >
          {message || 'Getting the good stuff ready…'}
        </Text>
        {retry && (
          <Pressable accessibilityRole="button" onPress={retry} style={s.button}>
            <Text style={s.buttonText}>Try again</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
function NativeEventBackdrop({ event }: { event: any }) {
  const source = eventImage(event);
  if (!source) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <Image
        source={source}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        blurRadius={8}
        accessible={false}
      />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#041322', opacity: 0.5 }]} />
    </View>
  );
}

function NativeNavIcon({ name, color }: { name: string; color: string }) {
  const paths: Record<string, string> = {
    Home: 'm3 10 9-7 9 7v11H3V10Zm5 11v-8h8v8',
    Order: 'M4 3v6a3 3 0 0 0 6 0V3M7 3v18M19 3v18M19 3c-4 2-5 6-5 9h5',
    'What’s On':
      'M9 18V5l12-2v13M9 8l12-2M9 18a3 3 0 1 1-3-3c1.7 0 3 1.3 3 3Zm12-2a3 3 0 1 1-3-3c1.7 0 3 1.3 3 3Z',
    Rewards: 'M3 8h18v5H3V8Zm2 5v8h14v-8M12 8v13M12 8H7a3 3 0 1 1 5-3v3Zm0 0h5a3 3 0 1 0-5-3v3Z',
    'My René': 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2',
    Basket: 'M5 7h14l2 14H3L5 7Zm4 0V6a3 3 0 0 1 6 0v1',
  };
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" accessible={false}>
      <Path
        d={paths[name] || paths.Home}
        fill="none"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
