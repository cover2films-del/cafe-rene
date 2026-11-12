import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  AppState,
  Switch,
} from 'react-native';
import * as Crypto from 'expo-crypto';
export function CircleNative({ user, api, run }: { user: any; api: any; run: any }) {
  const [groups, setGroups] = useState<any[]>([]),
    [id, setId] = useState(''),
    [detail, setDetail] = useState<any>(null),
    [title, setTitle] = useState(''),
    [query, setQuery] = useState('Demo'),
    [people, setPeople] = useState<any[]>([]),
    [body, setBody] = useState(''),
    [planTitle, setPlanTitle] = useState(''),
    [date, setDate] = useState(''),
    [time, setTime] = useState('19:00'),
    [notes, setNotes] = useState(''),
    [profile, setProfile] = useState<any>(null);
  const client = useRef<string | null>(null);
  const chosen = useRef('');
  const choose = (next: string) => {
    chosen.current = next;
    setId(next);
    setDetail(null);
  };
  const pullDetail = async (next: string) => {
    const value = await api('/circles/' + next);
    if (chosen.current === next) setDetail(value);
  };
  const load = async () => {
    setGroups(await api('/circles'));
    if (chosen.current) await pullDetail(chosen.current);
  };
  const act = (f: () => Promise<any>) =>
    run(async () => {
      await f();
      await load();
    });
  useEffect(() => {
    api('/circles/profile')
      .then(setProfile)
      .catch(() => {});
    api('/circles')
      .then((rows: any[]) => {
        setGroups(rows);
        const first = rows.find((g) => g.status === 'active');
        if (first) choose(first.id);
      })
      .catch(() => {});
  }, [user.id]);
  useEffect(() => {
    if (id) pullDetail(id).catch(() => setDetail(null));
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void load().catch(() => {});
    }, 10000);
    return () => clearInterval(timer);
  }, [id, user.id]);
  const button = (label: string, fn: () => void, secondary = false) => (
    <Pressable accessibilityRole="button" onPress={fn} style={[c.button, secondary && c.secondary]}>
      <Text style={c.buttonText}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={c.panel}>
      <Text style={c.eyebrow}>YOUR PEOPLE. YOUR PLANS.</Text>
      <Text style={c.title}>Your René circle.</Text>
      <Text style={c.body}>
        Private groups and messages. Only joined members can read or send. No external messages are
        sent.
      </Text>
      {groups.map((g) => (
        <View key={g.id} style={[c.choice, id === g.id && { borderColor: '#e9ed76' }]}>
          {g.status === 'invited' ? (
            <>
              <Text style={c.heading}>{g.title} · Invitation</Text>
              <View style={c.row}>
                {button(
                  'Join',
                  () =>
                    void act(async () => {
                      await api('/circles/' + g.id + '/respond', 'POST', { accept: true });
                      choose(g.id);
                    }),
                )}
                {button(
                  'Decline',
                  () =>
                    void act(() => api('/circles/' + g.id + '/respond', 'POST', { accept: false })),
                  true,
                )}
              </View>
            </>
          ) : (
            <Pressable onPress={() => choose(g.id)}>
              <Text style={c.heading}>
                {g.direct ? '◌' : '✦'} {g.title}
              </Text>
              <Text style={c.small}>{g.members} joined · Private</Text>
            </Pressable>
          )}
        </View>
      ))}
      <TextInput
        style={c.input}
        value={title}
        onChangeText={setTitle}
        maxLength={100}
        placeholder="Name your new private group"
        placeholderTextColor="#8baebd"
      />
      {button(
        'Create private group',
        () =>
          void act(async () => {
            const g = await api('/circles', 'POST', { title });
            setTitle('');
            choose(g.id);
          }),
        true,
      )}
      <TextInput
        style={c.input}
        value={query}
        onChangeText={setQuery}
        maxLength={80}
        placeholder="Find a discoverable member"
        placeholderTextColor="#8baebd"
      />
      {button(
        'Find people',
        () =>
          void run(async () =>
            setPeople(await api('/circles/directory?q=' + encodeURIComponent(query))),
          ),
        true,
      )}
      {people.map((p) => (
        <View key={p.id} style={c.person}>
          <Text style={c.heading}>{p.name}</Text>
          <View style={c.row}>
            {button(
              'Message',
              () =>
                void act(async () => {
                  const g = await api('/circles/direct', 'POST', { userId: p.id });
                  choose(g.id);
                }),
              true,
            )}
            {detail?.group.owner_id === user.id &&
              !detail.group.direct_key &&
              button(
                'Invite to group',
                () => void act(() => api('/circles/' + id + '/invite', 'POST', { userId: p.id })),
                true,
              )}
          </View>
        </View>
      ))}
      {detail && (
        <>
          <Text style={[c.title, { marginTop: 25 }]}>{detail.group.title}</Text>
          <Text style={c.small}>
            {detail.members
              .map((m: any) => m.name + (m.status === 'invited' ? ' (invited)' : ''))
              .join(' · ')}
          </Text>
          <ScrollView nestedScrollEnabled style={c.thread}>
            {detail.messages.map((m: any) => (
              <View key={m.id} style={[c.bubble, m.author_id === user.id && c.mine]}>
                <Text style={c.author}>{m.name}</Text>
                <Text style={c.message}>{m.body}</Text>
                <Text style={c.small}>
                  {new Date(m.created_at).toLocaleTimeString('en-GB', {
                    timeZone: 'Europe/London',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            ))}
          </ScrollView>
          <TextInput
            multiline
            style={[c.input, { minHeight: 75 }]}
            value={body}
            onChangeText={(t) => {
              setBody(t);
              client.current = null;
            }}
            maxLength={2000}
            placeholder="Say hello. Make a plan."
            placeholderTextColor="#8baebd"
          />
          {button(
            'Send private message',
            () =>
              void act(async () => {
                client.current ??= Crypto.randomUUID();
                await api('/circles/' + id + '/messages', 'POST', {
                  body,
                  clientId: client.current,
                });
                setBody('');
                client.current = null;
              }),
          )}
          <Text style={[c.title, { marginTop: 25 }]}>Make a night of it.</Text>
          {detail.plans.map((p: any) => (
            <View style={c.plan} key={p.id}>
              <Text style={c.heading}>{p.title}</Text>
              <Text style={c.body}>
                {new Date(p.starts_at).toLocaleString('en-GB', { timeZone: 'Europe/London' })}
              </Text>
              <Text style={c.small}>{p.notes}</Text>
              <View style={c.row}>
                {['yes', 'maybe', 'no'].map((response) => (
                  <Pressable
                    key={response}
                    onPress={() =>
                      void act(() =>
                        api('/circles/' + id + '/plans/' + p.id + '/rsvp', 'PUT', { response }),
                      )
                    }
                    style={[
                      c.chip,
                      p.rsvps.find((r: any) => r.user_id === user.id)?.response === response && {
                        backgroundColor: '#66714e',
                        borderColor: '#e9ed76',
                      },
                    ]}
                  >
                    <Text style={c.small}>
                      {response === 'yes' ? 'I’m in' : response === 'maybe' ? 'Maybe' : 'No'} ·{' '}
                      {p.rsvps.filter((r: any) => r.response === response).length}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
          <TextInput
            style={c.input}
            value={planTitle}
            onChangeText={setPlanTitle}
            placeholder="Plan title"
            placeholderTextColor="#8baebd"
            maxLength={100}
          />
          <Text style={c.small}>Date and time on your device · no booking is made</Text>
          <View style={c.row}>
            <TextInput
              style={[c.input, { flex: 1 }]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#8baebd"
            />
            <TextInput
              style={[c.input, { width: 95 }]}
              value={time}
              onChangeText={setTime}
              placeholder="19:00"
              placeholderTextColor="#8baebd"
            />
          </View>
          <TextInput
            style={c.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="A note for the group"
            placeholderTextColor="#8baebd"
            maxLength={500}
          />
          {button(
            'Add plan',
            () =>
              void act(async () => {
                const d = new Date(date + 'T' + time);
                if (Number.isNaN(d.getTime()))
                  throw Error('Enter a valid date (YYYY-MM-DD) and time.');
                await api('/circles/' + id + '/plans', 'POST', {
                  title: planTitle,
                  date: d.toISOString(),
                  notes,
                });
                setPlanTitle('');
                setNotes('');
              }),
            true,
          )}
        </>
      )}
      {profile && (
        <View style={c.row}>
          <Text style={[c.small, { flex: 1 }]}>Let members find my display name</Text>
          <Switch
            accessibilityLabel="Let other members find my display name"
            value={profile.discoverable}
            onValueChange={(v) =>
              void act(async () => {
                await api('/circles/profile', 'PUT', {
                  displayName: profile.display_name,
                  discoverable: v,
                });
                setProfile({ ...profile, discoverable: v });
              })
            }
          />
        </View>
      )}
      <Text style={c.small}>
        Demo Alex and Demo Sam are fictional. Plans and invitations stay inside the app.
      </Text>
    </View>
  );
}
const c = StyleSheet.create({
  panel: {
    backgroundColor: '#153044',
    padding: 20,
    borderColor: '#5bd4cf44',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 25,
  },
  eyebrow: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 8,
    letterSpacing: 1.6,
    color: '#8dece5',
    marginBottom: 14,
  },
  title: { fontFamily: 'RobotoSlab_700Bold', fontSize: 25, color: '#fff6e4', marginBottom: 15 },
  heading: { fontFamily: 'Roboto_700Bold', fontSize: 14, color: '#f9edc7', marginBottom: 8 },
  body: {
    fontFamily: 'Roboto_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: '#c3d8e0',
    marginBottom: 12,
  },
  small: { fontFamily: 'Roboto_400Regular', fontSize: 9, lineHeight: 16, color: '#a6c7d3' },
  input: {
    fontFamily: 'Roboto_400Regular',
    backgroundColor: '#092637',
    borderWidth: 1,
    borderColor: '#61cec73b',
    padding: 13,
    borderRadius: 6,
    color: '#edf5e8',
    fontSize: 12,
    marginTop: 12,
    minHeight: 45,
  },
  button: {
    backgroundColor: '#df3477',
    padding: 14,
    minHeight: 45,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  secondary: { backgroundColor: '#164957', borderWidth: 1, borderColor: '#6bcec65e' },
  buttonText: { fontFamily: 'Roboto_700Bold', fontSize: 12, color: '#f9f4d7' },
  row: { flexDirection: 'row', gap: 9, flexWrap: 'wrap' },
  choice: {
    borderWidth: 1,
    borderColor: '#57bfc642',
    borderRadius: 7,
    padding: 15,
    marginVertical: 6,
  },
  person: { borderBottomWidth: 1, borderBottomColor: '#4caaa43b', paddingVertical: 15 },
  thread: {
    maxHeight: 330,
    backgroundColor: '#081e2d',
    padding: 12,
    borderRadius: 8,
    marginVertical: 14,
  },
  bubble: {
    backgroundColor: '#20465c',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    maxWidth: '95%',
  },
  mine: { alignSelf: 'flex-end', backgroundColor: '#46345c' },
  author: { fontFamily: 'Roboto_700Bold', color: '#8dece5', fontSize: 10, marginBottom: 6 },
  message: {
    fontFamily: 'Roboto_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: '#f2f3e3',
    marginBottom: 6,
  },
  plan: {
    backgroundColor: '#0c4d4e',
    padding: 17,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#65d9c34c',
    marginBottom: 14,
  },
  chip: { padding: 8, borderWidth: 1, borderColor: '#4ebba94d', borderRadius: 20 },
});
