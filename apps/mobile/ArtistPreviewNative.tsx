import React, { useState } from 'react';
import { View, Text, Pressable, Linking, StyleSheet } from 'react-native';
export function ArtistPreviewNative({ artist, request }: { artist: string; request: any }) {
  const [sample, setSample] = useState<any>(null), [loading, setLoading] = useState(false);
  const play = async () => {
    setLoading(true);
    try {
      const result = await request('/artist-preview?q=' + encodeURIComponent(artist));
      setSample(result);
      if (result.available) await Linking.openURL(result.preview);
    } catch { setSample({ available: false, reason: 'Music preview is unavailable right now.' }); }
    finally { setLoading(false); }
  };
  return <View style={styles.wrap}><Pressable style={styles.button} disabled={loading} onPress={() => void play()}><Text style={styles.buttonText}>{loading ? 'Finding a sample…' : '▶ Hear a 30-second sample'}</Text></Pressable>{sample?.available && <Text style={styles.caption}>{sample.artist} · {sample.title} · Opens the preview player</Text>}{sample && !sample.available && <Text style={styles.caption}>{sample.reason}</Text>}</View>;
}
const styles = StyleSheet.create({ wrap: { marginVertical: 8 }, button: { backgroundColor: '#d01f6f', borderRadius: 8, padding: 12, alignSelf: 'flex-start' }, buttonText: { color: '#fff', fontWeight: '700' }, caption: { color: '#b9d8da', fontSize: 11, marginTop: 8 } });
