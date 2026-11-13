import React, { useMemo, useState } from 'react';
import { historyFacts, historyQuiz } from '../../../packages/shared/src/history';
export function HistoryHub() {
  const [factIndex, setFactIndex] = useState(() => Math.floor(Date.now() / 86400000) % historyFacts.length);
  const [quizIndex, setQuizIndex] = useState(() => Math.floor(Date.now() / 86400000) % historyQuiz.length);
  const [answer, setAnswer] = useState('');
  const fact = useMemo(() => historyFacts[factIndex], [factIndex]);
  const quiz = historyQuiz[quizIndex];
  return <section className="history-hub" style={{ '--history-image': `url("${fact.image}")` } as React.CSSProperties}>
    <div className="eyebrow">RENÉ + GLOUCESTER</div>
    <h2>Stories from around the corner.</h2>
    <div className="history-layout">
      <article className="history-fact">
        <span className="pill">{fact.place}</span>
        <p>{fact.fact}</p>
        <button className="outline" onClick={() => setFactIndex((i) => (i + 1) % historyFacts.length)}>Another fact ↻</button>
      </article>
      <article className="history-quiz">
        <span className="eyebrow">QUICK QUIZ</span>
        <h3>{quiz.question}</h3>
        <div className="chips">{quiz.options.map((option) => <button key={option} className={answer === option ? 'selected' : ''} onClick={() => setAnswer(option)}>{option}</button>)}</div>
        {answer && <strong className={answer === quiz.answer ? 'quiz-right' : 'quiz-wrong'}>{answer === quiz.answer ? 'Correct — +25 René Points when verified.' : 'Not quite — have another go.'}</strong>}
        <button className="text-link" onClick={() => { setQuizIndex((i) => (i + 1) % historyQuiz.length); setAnswer(''); }}>Next question →</button>
      </article>
    </div>
  </section>;
}
