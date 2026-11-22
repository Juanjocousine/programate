/**
 * Reglas verificadas en Mi Chuleta DAM 2.1.
 * La selección adaptativa acepta un generador aleatorio para poder probarla.
 * La nota de examen y el dominio de concepto no se mezclan.
 */

import { DAY_MS, HOUR_MS, questionLevel, ymd } from "./learning.mjs";

export function scoreQuestion(item, selected, cfg = { pen: true, multi: "prop" }) {
  if (item.kind === "self-check") {
    return { r: "b", sc: 0, note: "La autoevaluación no se corrige sola" };
  }
  const letters = item.options.map((option) => option.letter);
  const correct = item.correct;
  const multi = correct.length > 1 || item.multiple;
  const set = new Set(selected);
  if (!set.size) return { r: "b", sc: 0, note: "En blanco" };
  const exact = set.size === correct.length && correct.every((letter) => set.has(letter));
  if (multi && set.size >= letters.length) {
    return { r: "b", sc: 0, note: "Marcaste todas las opciones: cuenta como sin contestar" };
  }
  if (item.subjectId !== "ad" || cfg.pen === false) {
    return {
      r: exact ? "o" : "k",
      sc: exact ? 1 : 0,
      note: exact ? "" : "Sin penalización",
    };
  }
  if (!multi) return exact ? { r: "o", sc: 1, note: "" } : { r: "k", sc: -0.33, note: "" };
  if (cfg.multi === "none") {
    return {
      r: exact ? "o" : "k",
      sc: exact ? 1 : 0,
      note: exact ? "" : "Múltiple sin penalización (ajuste de práctica)",
    };
  }
  if (cfg.multi === "minus1") {
    return {
      r: exact ? "o" : "k",
      sc: exact ? 1 : -1,
      note: exact ? "" : "Múltiple: cualquier fallo resta 1 (interpretación)",
    };
  }
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
      : `Múltiple: cada acierto marcado suma 1/${correctCount} y cada fallo marcado resta 1/${wrongCount} (reparto proporcional: interpretación, no documentado)`,
  };
}

export function scoreLabel(subjectId, cfg, hasMulti) {
  if (subjectId !== "ad" || cfg.pen === false) {
    return {
      lab: "practice",
      text: "Práctica: cada acierto vale 1 y el resto 0. No es una nota de examen.",
    };
  }
  if (hasMulti && cfg.multi !== "none") {
    const multiText =
      cfg.multi === "minus1"
        ? "+1 si es exacta y −1 si hay cualquier fallo"
        : "reparto proporcional entre aciertos y fallos";
    return {
      lab: "assumed",
      text: `Única: +1 / −0,33, regla confirmada. Múltiple: ${multiText}. Esa parte múltiple es una interpretación, no una regla escrita del examen.`,
    };
  }
  return {
    lab: "conf",
    text: "Única: +1 / −0,33. Es la regla confirmada para Acceso a Datos.",
  };
}

export function examPreparation(sims, subjectId, conceptTotal) {
  const list = (sims || [])
    .filter((sim) => sim.subjectId === subjectId && sim.kind !== "err")
    .sort((a, b) => a.t - b.t);
  if (!list.length) {
    return {
      n: 0,
      state: "sin",
      message:
        "Todavía no hay ningún simulacro de esta asignatura. Los ejercicios sueltos no entran aquí: miden práctica, no un examen.",
    };
  }
  const last = list[list.length - 1];
  const recent = list.slice(-3);
  const avg = recent.reduce((sum, sim) => sum + sim.grade, 0) / recent.length;
  const min = Math.min(...recent.map((sim) => sim.grade));
  const topics = new Set();
  for (const sim of list) {
    for (const item of sim.items || []) if (item.conceptId) topics.add(item.conceptId);
  }
  return {
    n: list.length,
    state: list.length < 2 ? "poco" : "orient",
    last: last.grade,
    avg,
    min,
    topics: topics.size,
    total: conceptTotal,
    trend: list.length >= 2 ? last.grade - list[list.length - 2].grade : null,
    message:
      list.length < 2
        ? "Solo hay 1 simulacro. Es un dato, no una tendencia."
        : `Con ${list.length} simulacros hay una orientación, no una predicción del examen.`,
  };
}

function subKey(question) {
  return question.subconceptId || question.conceptId;
}

export function summarize(log, questions) {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const subconcepts = {};
  for (const question of questions) {
    const key = subKey(question);
    if (!subconcepts[key]) {
      subconcepts[key] = {
        id: key,
        conceptId: question.conceptId,
        subjectId: question.subjectId,
        total: 0,
        answerCount: 0,
        real: [],
        correctIds: new Set(),
        correctDays: new Set(),
        lastResult: "",
      };
    }
    subconcepts[key].total += 1;
  }
  const concepts = {};
  for (const question of questions) {
    if (!concepts[question.conceptId]) {
      concepts[question.conceptId] = {
        id: question.conceptId,
        subjectId: question.subjectId,
        answerCount: 0,
        rec: [],
        subs: new Set(),
      };
    }
    concepts[question.conceptId].subs.add(subKey(question));
  }
  const sorted = [...log].sort((a, b) => a.t - b.t);
  for (const event of sorted) {
    const question = byId.get(event.id);
    if (!question) continue;
    const sub = subconcepts[subKey(question)];
    const concept = concepts[question.conceptId];
    sub.answerCount += 1;
    concept.answerCount += 1;
    concept.rec.push(event);
    if (event.rt) continue;
    sub.real.push(event);
    sub.lastResult = event.r;
    if (event.r === "o") {
      sub.correctIds.add(event.id);
      sub.correctDays.add(ymd(event.t));
    }
  }
  for (const sub of Object.values(subconcepts)) {
    const recent = sub.real.slice(-6);
    sub.recentAccuracy = recent.length
      ? recent.filter((event) => event.r === "o").length / recent.length
      : null;
    const need = Math.min(2, sub.total);
    const realCount = sub.real.length;
    sub.level =
      sub.answerCount === 0
        ? 0
        : realCount >= 3 &&
            sub.recentAccuracy >= 0.8 &&
            sub.correctDays.size >= 2 &&
            sub.correctIds.size >= need &&
            sub.lastResult === "o"
          ? 3
          : realCount >= 2 &&
              sub.recentAccuracy >= 0.6 &&
              sub.lastResult === "o" &&
              sub.correctIds.size >= 1
            ? 2
            : 1;
  }
  for (const concept of Object.values(concepts)) {
    const recent = concept.rec.slice(-10);
    concept.recentAccuracy = recent.length
      ? recent.filter((event) => event.r === "o").length / recent.length
      : null;
    const levels = [...concept.subs].map((key) => subconcepts[key]?.level ?? 0);
    const avg = levels.length ? levels.reduce((sum, level) => sum + level, 0) / levels.length : 0;
    concept.level = concept.answerCount === 0 ? 0 : avg >= 2.5 ? 3 : avg >= 1.6 ? 2 : 1;
    concept.few = concept.answerCount < 3;
  }
  return { subconcepts, concepts };
}

export function weakSubconcepts(summary) {
  return Object.values(summary.subconcepts)
    .filter((sub) => sub.real.length >= 2 && sub.recentAccuracy != null && sub.recentAccuracy < 0.7)
    .sort(
      (a, b) =>
        (1 - b.recentAccuracy) * Math.min(b.real.length, 8) -
        (1 - a.recentAccuracy) * Math.min(a.real.length, 8),
    );
}

export function recurringConfusions(log, questions, confusions, now = Date.now()) {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const since = now - 21 * DAY_MS;
  const fails = {};
  for (const event of log) {
    if (event.t < since || event.r === "o" || event.rt) continue;
    const question = byId.get(event.id);
    if (!question) continue;
    const key = subKey(question);
    fails[key] = (fails[key] || 0) + 1;
  }
  return (confusions || [])
    .map((confusion) => {
      const per = confusion.subconceptIds.map((id) => ({ id, n: fails[id] || 0 }));
      const total = per.reduce((sum, row) => sum + row.n, 0);
      const distinct = per.filter((row) => row.n > 0).length;
      const flag = confusion.subconceptIds.length > 1 ? distinct >= 2 || total >= 3 : total >= 2;
      return { ...confusion, per, total, flag };
    })
    .filter((row) => row.flag);
}

function candidateScore(question, states, summary, now, last, used, random, subOf) {
  const state = states[question.id];
  const key = subKey(question);
  const sub = summary.subconcepts[key];
  const concept = summary.concepts[question.conceptId];
  let score = random() * 4;
  let best = 0;
  let why = "Variedad: tema que conviene mezclar.";
  const add = (value, reason) => {
    score += value;
    if (value > best) {
      best = value;
      why = reason;
    }
  };
  if (!state || !state.n) {
    add(12, "Todavía no la habías visto.");
    if (sub && sub.answerCount === 0) add(16, "Concepto que aún no has practicado.");
  } else {
    if (state.pend) add(30, "Error pendiente de otro día.");
    else if (state.due <= now) add(28, "Te toca repasarla.");
    if (questionLevel(state) === 2 && state.due > now) score -= 20;
    if (now - state.last < HOUR_MS) score -= 15;
  }
  if (sub && sub.answerCount > 0 && sub.level <= 1 && sub.recentAccuracy != null && sub.recentAccuracy < 0.7) {
    add(18 * (1 - sub.recentAccuracy) + 6, "Concepto flojo.");
  }
  const siblingPending = [...subOf.entries()].some(
    ([id, subconceptId]) => id !== question.id && subconceptId === key && states[id]?.pend,
  );
  if (sub && siblingPending && (!state || !state.n || !state.pend)) {
    add(14, "Variante de un concepto que has fallado.");
  }
  if (concept && concept.recentAccuracy != null) score += 10 * (1 - concept.recentAccuracy);
  if (last && subKey(last) === key) score -= 10;
  const times = used[key] || 0;
  if (times >= 2) score -= 8 * (times - 1);
  return { score, why };
}

export function selectQuestions(pool, states, summary, count, options = {}) {
  const now = options.now ?? Date.now();
  const random = options.random ?? Math.random;
  const catalog = options.catalog || pool;
  const subOf = new Map(catalog.map((question) => [question.id, subKey(question)]));
  const rest = pool.slice();
  const chosen = [];
  const used = {};
  const why = {};
  while (chosen.length < count && rest.length) {
    const last = chosen[chosen.length - 1];
    let bestIndex = 0;
    let bestScore = -1e9;
    let bestWhy = "";
    rest.forEach((question, index) => {
      const scored = candidateScore(question, states, summary, now, last, used, random, subOf);
      if (scored.score > bestScore) {
        bestScore = scored.score;
        bestIndex = index;
        bestWhy = scored.why;
      }
    });
    const question = rest.splice(bestIndex, 1)[0];
    const key = subKey(question);
    chosen.push(question);
    used[key] = (used[key] || 0) + 1;
    why[question.id] = bestWhy;
  }
  return { questions: chosen, why };
}

export function recommendNext({ logLength, dueCount, pendingCount, weakName, unseenCount }) {
  if (!logLength) {
    return {
      kind: "learn",
      title: "Empieza con Acceso a Datos",
      detail: "Diez preguntas con explicación. A partir de ahí el repaso sabe qué toca.",
    };
  }
  if (dueCount > 0) {
    return {
      kind: "due",
      title: dueCount === 1 ? "1 repaso para hoy" : `${dueCount} repasos para hoy`,
      detail: "Son preguntas que ya respondiste y cuyo plazo ha llegado.",
    };
  }
  if (pendingCount > 0) {
    return {
      kind: "errors",
      title: "Repasar errores pendientes",
      detail: "Un acierto justo después del fallo no las da por dominadas.",
    };
  }
  if (weakName) {
    return {
      kind: "weak",
      title: `Practicar «${weakName}»`,
      detail: "Es de lo que peor sale en los últimos intentos.",
    };
  }
  if (unseenCount > 0) {
    return {
      kind: "learn",
      title: "Ver algo que todavía no has practicado",
      detail: "Hay preguntas del banco sin ningún intento.",
    };
  }
  return {
    kind: "sim",
    title: "Hacer un simulacro de Acceso a Datos",
    detail: "La preparación del examen solo mira simulacros, no la práctica suelta.",
  };
}
