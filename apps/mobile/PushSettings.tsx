import * as Crypto from 'expo-crypto';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Switch, StyleSheet, Platform, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
export async function savedPushToken() {
  return await SecureStore.getItemAsync('rene-push-token');
}
export function useNotificationLinks(onOpen: (data: any) => void) {
  const callback = useRef(onOpen);
  callback.current = onOpen;
  useEffect(() => {
    let active = true;
    const handle = async (response: Notifications.NotificationResponse | null) => {
      if (!response || !active) return;
      const id = response.notification.request.identifier;
      if ((await SecureStore.getItemAsync('rene-last-notification')) === id) return;
      await SecureStore.setItemAsync('rene-last-notification', id);
      callback.current(response.notification.request.content.data);
    };
    const sub = Notifications.addNotificationResponseReceivedListener((r) => void handle(r));
    void Notifications.getLastNotificationResponseAsync()
      .then(handle)
      .catch(() => {});
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
}
export function PushSettings({
  request,
  user,
  setUser,
}: {
  request: any;
  user: any;
  setUser: any;
}) {
  const [prefs, setPrefs] = useState({
      messages: true,
      deals: false,
      rewards: true,
      gigs: true,
      events: true,
    }),
    [status, setStatus] = useState(''),
    [busy, setBusy] = useState(false),
    [registered, setRegistered] = useState(false);
  useEffect(() => {
    let active = true;
    request('/notifications/status')
      .then(async (result: any) => {
        const token = await savedPushToken();
        const id = token
          ? await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token)
          : null;
        if (!active) return;
        const device = result.devices.find((d: any) => d.active && d.id === id);
        if (device) {
          setPrefs(device.preferences);
          setRegistered(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [request, user.id]);
  const enable = async () => {
    setBusy(true);
    try {
      if (!Device.isDevice)
        throw Error('Use a physical iPhone or Android phone for remote notifications.');
      let permission = await Notifications.getPermissionsAsync();
      if (!permission.granted)
        permission = await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowSound: true, allowBadge: true },
        });
      if (!permission.granted)
        throw Error('Allow notifications in your phone Settings to receive banners.');
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      if (!projectId) throw Error('This build is not linked to its Expo project.');
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      const result = await request('/notifications/device', 'POST', {
        token,
        platform: Platform.OS,
        preferences: prefs,
      });
      if (result.user) setUser(result.user);
      await SecureStore.setItemAsync('rene-push-token', token);
      setRegistered(true);
      setStatus(
        result.deliveryEnabled
          ? 'Notifications are enabled for your selected categories.'
          : 'Saved. The venue’s notification delivery is currently paused.',
      );
    } catch (e) {
      setStatus(
        e instanceof Error
          ? e.message
          : 'Notifications could not be enabled. Check your connection and Apple push setup.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={s.panel}>
      <Text style={s.title}>Stay in the René loop.</Text>
      <Text style={s.body}>
        Choose what appears in your iPhone Notification Centre. We keep message text off the lock
        screen.
      </Text>
      {Object.entries({
        messages: 'New private messages',
        deals: 'Offers and deals',
        rewards: 'Points and rewards',
        gigs: 'Live gigs',
        events: 'Venue events and programme updates',
      }).map(([key, label]) => (
        <View style={s.row} key={key}>
          <Text style={[s.body, { flex: 1 }]}>{label}</Text>
          <Switch
            accessibilityLabel={label}
            value={prefs[key as keyof typeof prefs]}
            onValueChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))}
          />
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        style={[s.button, busy && { opacity: 0.5 }]}
        onPress={() => void enable()}
      >
        <Text style={s.buttonText}>
          {registered ? 'Save notification choices' : 'Enable phone notifications'}
        </Text>
      </Pressable>
      {registered && (
        <>
          <Pressable
            style={s.button}
            onPress={() =>
              void request('/notifications/test', 'POST', {})
                .then(() => setStatus('A notification has been queued for this account.'))
                .catch(() =>
                  setStatus(
                    'The test could not be queued. Check your connection and selected categories.',
                  ),
                )
            }
          >
            <Text style={s.buttonText}>Send me a test notification</Text>
          </Pressable>
          <Pressable
            style={s.button}
            onPress={() =>
              void (async () => {
                const token = await savedPushToken();
                if (token) {
                  await request('/notifications/device', 'DELETE', { token });
                  await SecureStore.deleteItemAsync('rene-push-token');
                }
                setRegistered(false);
                setStatus('This phone’s notifications are disabled.');
              })().catch(() =>
                setStatus('Could not disable notifications. Please retry with a connection.'),
              )
            }
          >
            <Text style={s.buttonText}>Disable this phone</Text>
          </Pressable>
        </>
      )}
      {!!status && (
        <Text accessibilityRole="alert" style={s.small}>
          {status}
        </Text>
      )}
      <Pressable onPress={() => void Linking.openSettings()}>
        <Text style={s.link}>Open phone notification settings ↗</Text>
      </Pressable>
      <Text style={s.small}>
        Banners depend on iPhone permission, Focus settings and Apple push configuration. Offers are
        optional marketing; other categories can be selected independently.
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  panel: {
    padding: 22,
    borderRadius: 20,
    backgroundColor: '#15394b',
    borderWidth: 1,
    borderColor: '#6edbd455',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'BreeSerif_400Regular',
    fontSize: 29,
    lineHeight: 37,
    color: '#fff9ed',
    marginBottom: 12,
  },
  body: { fontFamily: 'Roboto_400Regular', fontSize: 14, lineHeight: 22, color: '#d0e4e7' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', marginVertical: 10 },
  button: {
    padding: 15,
    borderRadius: 12,
    minHeight: 48,
    backgroundColor: '#b62d69',
    marginTop: 12,
  },
  buttonText: { fontFamily: 'Roboto_700Bold', color: '#fff9ed', textAlign: 'center' },
  small: { fontSize: 11, lineHeight: 18, color: '#c0d7df', marginTop: 14 },
  link: { color: '#edf29b', marginTop: 18 },
});
