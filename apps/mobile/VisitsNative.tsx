import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, AppState } from 'react-native';
export function VisitsNative({
  user,
  request,
  onScan,
  revision = 0,
  history = false,
}: {
  user: any;
  request: any;
  onScan: () => void;
  revision?: number;
  history?: boolean;
}) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    if (!user) {
      setData(null);
      return;
    }
    let active = true;
    const load = () =>
      request('/visits')
        .then((r: any) => {
          if (active) setData(r);
        })
        .catch(() => {});
    void load();
    const sub = AppState.addEventListener('change', (v) => {
      if (v === 'active') void load();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, [user?.id, request, revision]);
  return (
    <View style={s.panel}>
      <Text style={s.eyebrow}>MAKE YOURSELF A REGULAR</Text>
      <Text style={s.title}>
        {data?.checkedInToday ? 'Good to see you at René.' : 'At René? Check in.'}
      </Text>
      <Text style={s.body}>
        {data?.checkedInToday
          ? 'Your visit is recorded for today.'
          : 'Scan the printed venue QR with your phone camera to record your visit.'}
      </Text>
      {!data?.checkedInToday && (
        <Pressable accessibilityRole="button" style={s.button} onPress={onScan}>
          <Text style={s.buttonText}>{user ? 'Scan to check in' : 'Sign in to check in'}</Text>
        </Pressable>
      )}
      {history &&
        data?.visits.map((v: any) => (
          <View key={v.id} style={s.visit}>
            <Text style={s.body}>
              {new Date(v.day + 'T12:00:00Z').toLocaleDateString('en-GB', {
                timeZone: 'Europe/London',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <Text style={s.small}>Visit recorded</Text>
          </View>
        ))}
      <Text style={s.small}>
        Check-ins are your visit journal. Food stamps come from completed eligible food orders.
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  panel: {
    padding: 22,
    backgroundColor: '#144e53',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#7cdec755',
    marginVertical: 20,
  },
  eyebrow: { fontSize: 10, letterSpacing: 1, color: '#c0fae5' },
  title: {
    fontFamily: 'BreeSerif_400Regular',
    fontSize: 29,
    lineHeight: 37,
    color: '#fff9ed',
    marginVertical: 12,
  },
  body: { fontSize: 14, lineHeight: 22, color: '#d2e7e9' },
  button: { padding: 16, backgroundColor: '#af2c66', borderRadius: 12, marginTop: 16 },
  buttonText: { color: '#fff9ed', textAlign: 'center', fontFamily: 'Roboto_700Bold' },
  small: { fontSize: 11, lineHeight: 18, color: '#c4dade', marginTop: 12 },
  visit: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#ffffff22', marginTop: 12 },
});
