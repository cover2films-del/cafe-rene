import React, { useState } from 'react';
import { View, Text, Pressable, ImageBackground, StyleSheet } from 'react-native';
import { historyFacts, historyQuiz } from '../../packages/shared/src/history';
export function HistoryNative({ images }: { images: Record<string, any> }) {
  const [factIndex, setFactIndex] = useState(Math.floor(Date.now() / 86400000) % historyFacts.length);
  const [quizIndex, setQuizIndex] = useState(Math.floor(Date.now() / 86400000) % historyQuiz.length);
  const [answer, setAnswer] = useState('');
  const fact = historyFacts[factIndex];
  const quiz = historyQuiz[quizIndex];
  return <View style={styles.wrap}>
    <Text style={styles.eyebrow}>RENÉ + GLOUCESTER</Text><Text style={styles.title}>Stories from around the corner.</Text>
    <ImageBackground source={images[fact.place === 'René' ? 'club' : 'burger']} style={styles.fact} imageStyle={{ opacity: .2 }}>
      <Text style={styles.pill}>{fact.place}</Text><Text style={styles.body}>{fact.fact}</Text>
      <Pressable style={styles.button} onPress={() => setFactIndex((i) => (i + 1) % historyFacts.length)}><Text style={styles.buttonText}>Another fact ↻</Text></Pressable>
    </ImageBackground>
    <View style={styles.quiz}><Text style={styles.eyebrow}>QUICK QUIZ</Text><Text style={styles.title}>{quiz.question}</Text>
      {quiz.options.map((option) => <Pressable key={option} style={[styles.choice, answer === option && styles.selected]} onPress={() => setAnswer(option)}><Text style={styles.body}>{option}</Text></Pressable>)}
      {!!answer && <Text style={answer === quiz.answer ? styles.right : styles.wrong}>{answer === quiz.answer ? 'Correct — +25 René Points when verified.' : 'Not quite — have another go.'}</Text>}
      <Pressable onPress={() => { setQuizIndex((i) => (i + 1) % historyQuiz.length); setAnswer(''); }}><Text style={styles.link}>Next question →</Text></Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({ wrap: { marginVertical: 25 }, eyebrow: { color: '#b8e8e0', fontSize: 10, letterSpacing: 2, marginBottom: 8 }, title: { color: '#fff7e7', fontSize: 22, fontWeight: '700', marginBottom: 14 }, body: { color: '#d3e5e5', lineHeight: 21, marginBottom: 12 }, fact: { padding: 18, borderRadius: 16, overflow: 'hidden', backgroundColor: '#113546', marginBottom: 15 }, pill: { color: '#f1ed89', marginBottom: 12 }, button: { alignSelf: 'flex-start', backgroundColor: '#d01f6f', padding: 11, borderRadius: 8 }, buttonText: { color: '#fff', fontWeight: '700' }, quiz: { backgroundColor: '#163c4b', borderRadius: 16, padding: 18 }, choice: { borderWidth: 1, borderColor: '#6ed8d055', padding: 12, borderRadius: 10, marginBottom: 8 }, selected: { backgroundColor: '#1f827b' }, right: { color: '#b9f39c', marginVertical: 10 }, wrong: { color: '#ffb0b0', marginVertical: 10 }, link: { color: '#f1ed89', marginTop: 12 } });
