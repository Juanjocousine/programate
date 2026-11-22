/**
 * Repaso espaciado de Mi Chuleta DAM.
 * Los intervalos y el día local son los de la 2.0.
 * La 2.1 añade `pend`: un acierto el mismo día del fallo, o un reintento inmediato,
 * no sube la caja. Las pruebas de la 2.0 siguen cubriendo el caso sin fallo previo.
 * El día se calcula en hora local. El vencimiento suma múltiplos de 86.400.000 ms.
 */

export const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];
export const DAY_MS = 86400000;
export const HOUR_MS = 3600000;

export function blankState() {
  return {
    n: 0,
    ok: 0,
    ko: 0,
    bl: 0,
    box: 0,
    due: 0,
    last: 0,
    lastRes: "",
    streak: 0,
    lastAdv: "",
    first: 0,
    pend: 0,
    failDay: "",
    failTs: 0,
    rtok: 0,
    okDays: 0,
    lastOkDay: "",
  };
}

export function ymd(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function applyAnswer(state, result, ts, immediateRetry = false) {
  state.n += 1;
  state.last = ts;
  if (!state.first) state.first = ts;
  state.lastRes = result;
  const day = ymd(ts);
  if (result === "o") {
    state.ok += 1;
    if (immediateRetry || (state.pend && state.failDay === day)) {
      state.rtok = (state.rtok || 0) + 1;
      state.streak = 0;
      state.due = Math.max(state.due, ts + INTERVAL_DAYS[1] * DAY_MS);
    } else {
      state.pend = 0;
      state.streak += 1;
      if (state.lastOkDay !== day) {
        state.okDays = (state.okDays || 0) + 1;
        state.lastOkDay = day;
      }
      if (state.lastAdv !== day) {
        state.box = Math.min(5, state.box + 1);
        state.lastAdv = day;
        state.due = ts + INTERVAL_DAYS[state.box] * DAY_MS;
      }
    }
  } else {
    if (result === "k") state.ko += 1;
    else state.bl += 1;
    state.streak = 0;
    state.lastAdv = "";
    state.pend = 1;
    state.failDay = day;
    state.failTs = ts;
    state.box = result === "k" ? 0 : Math.max(0, state.box - 1);
    state.due = ts;
  }
  return state;
}

export function derive(log) {
  const q = {};
  const days = {};
  for (const event of log.slice().sort((a, b) => a.t - b.t)) {
    applyAnswer(q[event.id] || (q[event.id] = blankState()), event.r, event.t, !!event.rt);
    const day = ymd(event.t);
    const bucket = days[day] || (days[day] = { o: 0, k: 0, b: 0 });
    bucket[event.r] += 1;
  }
  return { q, days };
}

export function questionLevel(state) {
  if (!state || !state.n) return 0;
  if (state.pend) return 0;
  if (state.box >= 3 && state.lastRes === "o") return 2;
  if (state.box >= 1 && state.lastRes === "o") return 1;
  return 0;
}

export function isDue(state, now) {
  return !!(state && state.n && state.due <= now);
}

export function scoreItem(item, selected, rule) {
  const letters = item.options.map((option) => option.letter);
  const correct = item.correct;
  const multi = correct.length > 1 || item.multiple;
  const set = new Set(selected);
  if (!set.size) return { r: "b", sc: 0, note: "En blanco" };
  const exact = set.size === correct.length && correct.every((letter) => set.has(letter));
  if (multi && set.size >= letters.length) {
    return { r: "b", sc: 0, note: "Marcaste todas las opciones: cuenta como sin contestar" };
  }
  if (rule === "plain") {
    return exact
      ? { r: "o", sc: 1, note: "" }
      : { r: "k", sc: 0, note: "Sin penalización (no hay regla documentada para esta asignatura)" };
  }
  if (!multi) return exact ? { r: "o", sc: 1, note: "" } : { r: "k", sc: -0.33, note: "" };
  const correctCount = correct.length;
  const wrongCount = letters.length - correctCount;
  const good = correct.filter((letter) => set.has(letter)).length;
  const bad = [...set].filter((letter) => !correct.includes(letter)).length;
  let sc = good / correctCount - (wrongCount ? bad / wrongCount : 0);
  sc = Math.max(-1, Math.min(1, sc));
  sc = Math.round(sc * 100) / 100;
  return {
    r: exact ? "o" : "k",
    sc,
    note: exact
      ? ""
      : `Múltiple: cada acierto marcado suma 1/${correctCount} y cada fallo marcado resta 1/${wrongCount} (reparto proporcional: interpretación, no está documentado)`,
  };
}

export function pointsToStore(mode, examScore) {
  if (mode === "sim") return examScore.sc;
  return examScore.r === "o" ? 1 : 0;
}

export function simulationGrade(scores) {
  const n = scores.length;
  const score = Math.round(scores.reduce((sum, value) => sum + value, 0) * 100) / 100;
  const grade = Math.max(0, Math.round((score / n) * 100) / 10);
  return { score, n, grade };
}

export function countsTowardEstimate(event) {
  return !event.sf;
}

export function estimateGrade(events) {
  const arr = events.slice(-30);
  if (arr.length < 20) return { ok: false, have: arr.length };
  const avg = arr.reduce((sum, event) => sum + event.sc, 0) / arr.length;
  const acc = Math.round((arr.filter((event) => event.r === "o").length / arr.length) * 100);
  return { ok: true, n: arr.length, grade: Math.max(0, Math.min(10, avg * 10)), acc };
}

export function questionPriority({
  conceptId,
  state,
  recentAccuracy,
  now,
  lastConceptId,
  random = Math.random,
}) {
  let score = random() * 5;
  const unseen = !state || !state.n;
  if (unseen) {
    score += 12;
    if (recentAccuracy != null && recentAccuracy < 0.6) score += 10;
  } else {
    if (state.due <= now) score += 30 + Math.min(20, ((now - state.due) / DAY_MS) * 2);
    if (state.lastRes !== "o") score += 25;
    if (questionLevel(state) === 2 && state.due > now) score -= 20;
    if (now - state.last < HOUR_MS) score -= 15;
  }
  if (recentAccuracy != null) score += 20 * (1 - recentAccuracy);
  if (lastConceptId && lastConceptId === conceptId) score -= 8;
  return score;
}

export function isWeakConcept({ answerCount, recentAccuracy }) {
  return answerCount >= 2 && recentAccuracy != null && recentAccuracy < 0.7;
}

export function weaknessRank(answerCount, recentAccuracy) {
  return (1 - recentAccuracy) * Math.min(answerCount, 10);
}

export function conceptStanding({ answerCount, recentAccuracy, dominatedQuestions, questionCount }) {
  const few = answerCount < 3;
  let level = 0;
  if (answerCount === 0) level = 0;
  else if (
    answerCount >= 3 &&
    recentAccuracy >= 0.8 &&
    dominatedQuestions >= Math.ceil(questionCount / 2)
  ) {
    level = 2;
  } else if (recentAccuracy >= 0.5) level = 1;
  return { level, few };
}
