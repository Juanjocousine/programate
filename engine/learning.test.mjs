import assert from "node:assert/strict";
import test from "node:test";
import {
  DAY_MS,
  HOUR_MS,
  applyAnswer,
  blankState,
  conceptStanding,
  countsTowardEstimate,
  derive,
  estimateGrade,
  isDue,
  isWeakConcept,
  pointsToStore,
  questionLevel,
  questionPriority,
  scoreItem,
  simulationGrade,
  weaknessRank,
} from "./learning.mjs";

const noon = (year, monthIndex, day) => new Date(year, monthIndex, day, 12, 0, 0).getTime();

test("un acierto sube una caja una sola vez por día local", () => {
  const day1 = noon(2026, 10, 20);
  const later = day1 + 60 * 60 * 1000;
  const state = blankState();
  applyAnswer(state, "o", day1);
  assert.equal(state.box, 1);
  assert.equal(state.due, day1 + DAY_MS);
  assert.equal(state.streak, 1);
  applyAnswer(state, "o", later);
  assert.equal(state.box, 1);
  assert.equal(state.due, day1 + DAY_MS);
  assert.equal(state.ok, 2);
  const day2 = noon(2026, 10, 21);
  applyAnswer(state, "o", day2);
  assert.equal(state.box, 2);
  assert.equal(state.due, day2 + 3 * DAY_MS);
});

test("un fallo reinicia la caja y un blanco solo la baja un peldaño", () => {
  const start = noon(2026, 10, 20);
  const state = blankState();
  applyAnswer(state, "o", start);
  applyAnswer(state, "o", noon(2026, 10, 21));
  assert.equal(state.box, 2);
  applyAnswer(state, "b", noon(2026, 10, 22));
  assert.equal(state.box, 1);
  assert.equal(state.streak, 0);
  assert.equal(state.bl, 1);
  applyAnswer(state, "k", noon(2026, 10, 23));
  assert.equal(state.box, 0);
  assert.equal(state.due, noon(2026, 10, 23));
  assert.equal(state.ko, 1);
});

test("la caja no pasa de 5", () => {
  const state = blankState();
  for (let i = 0; i < 6; i += 1) applyAnswer(state, "o", noon(2026, 10, 20 + i));
  assert.equal(state.box, 5);
  assert.equal(state.due, noon(2026, 10, 25) + 30 * DAY_MS);
});

test("el nivel sale de la caja y de la última respuesta", () => {
  assert.equal(questionLevel(blankState()), 0);
  const learning = blankState();
  applyAnswer(learning, "o", noon(2026, 10, 20));
  assert.equal(questionLevel(learning), 1);
  const mastered = blankState();
  for (let i = 0; i < 3; i += 1) applyAnswer(mastered, "o", noon(2026, 10, 20 + i));
  assert.equal(questionLevel(mastered), 2);
  applyAnswer(mastered, "b", noon(2026, 10, 24));
  assert.equal(questionLevel(mastered), 0);
});

test("lo no visto no está vencido; lo fallado sí", () => {
  const now = noon(2026, 10, 20);
  assert.equal(isDue(blankState(), now), false);
  const state = blankState();
  applyAnswer(state, "k", now);
  assert.equal(isDue(state, now), true);
  assert.equal(isDue(state, now - 1), false);
});

test("derive reconstruye el estado desde el registro", () => {
  const t = noon(2026, 10, 20);
  const derived = derive([
    { id: "ad01", r: "k", t: t + 1 },
    { id: "ad01", r: "o", t },
  ]);
  assert.equal(derived.q.ad01.n, 2);
  assert.equal(derived.q.ad01.box, 0);
  assert.equal(derived.q.ad01.lastRes, "k");
});

const four = (correct, multiple = correct.length > 1) => ({
  options: ["a", "b", "c", "d"].map((letter) => ({ letter })),
  correct,
  multiple,
});

test("puntuación de AD y puntuación sin regla documentada", () => {
  const single = four(["c"], false);
  assert.deepEqual(scoreItem(single, [], "ad"), { r: "b", sc: 0, note: "En blanco" });
  assert.equal(scoreItem(single, ["c"], "ad").sc, 1);
  assert.equal(scoreItem(single, ["a"], "ad").sc, -0.33);
  assert.equal(scoreItem(single, ["a"], "plain").sc, 0);

  const multi = four(["a", "c"], true);
  assert.equal(scoreItem(multi, ["a", "b", "c", "d"], "ad").r, "b");
  assert.equal(scoreItem(multi, ["a", "b"], "ad").sc, 0);
  const partial = scoreItem({ ...four(["a", "b", "c"], true) }, ["a", "b", "d"], "ad");
  assert.equal(partial.r, "k");
  assert.equal(partial.sc, -0.33);
});

test("aprender guarda 1 o 0; el simulacro guarda la puntuación de examen", () => {
  const wrong = scoreItem(four(["c"], false), ["a"], "ad");
  assert.equal(pointsToStore("apr", wrong), 0);
  assert.equal(pointsToStore("sim", wrong), -0.33);
  assert.equal(pointsToStore("due", scoreItem(four(["c"], false), ["c"], "ad")), 1);
});

test("nota de simulacro y nota estimada", () => {
  assert.deepEqual(simulationGrade([1, 1, -0.33]), { score: 1.67, n: 3, grade: 5.6 });
  assert.equal(simulationGrade([-0.33, -0.33]).grade, 0);
  assert.equal(estimateGrade(Array.from({ length: 19 }, () => ({ sc: 1, r: "o" }))).ok, false);
  const ready = estimateGrade(Array.from({ length: 20 }, () => ({ sc: 1, r: "o" })));
  assert.equal(ready.grade, 10);
  assert.equal(ready.acc, 100);
  const clamped = estimateGrade(Array.from({ length: 20 }, () => ({ sc: -1, r: "k" })));
  assert.equal(clamped.grade, 0);
  assert.equal(countsTowardEstimate({ sf: 1 }), false);
  assert.equal(countsTowardEstimate({}), true);
});

test("prioridad adaptativa con azar fijado", () => {
  const now = noon(2026, 10, 20);
  assert.equal(
    questionPriority({
      conceptId: "col.elegir",
      state: blankState(),
      recentAccuracy: 0.5,
      now,
      lastConceptId: null,
      random: () => 0,
    }),
    32,
  );
  const due = blankState();
  const overdue = 2 * HOUR_MS;
  applyAnswer(due, "k", now - overdue);
  const dueBonus = 30 + Math.min(20, (overdue / DAY_MS) * 2) + 25;
  assert.equal(
    questionPriority({
      conceptId: "col.elegir",
      state: due,
      recentAccuracy: null,
      now,
      lastConceptId: "otro",
      random: () => 0,
    }),
    dueBonus,
  );
  assert.equal(
    questionPriority({
      conceptId: "col.elegir",
      state: due,
      recentAccuracy: null,
      now,
      lastConceptId: "col.elegir",
      random: () => 0,
    }),
    dueBonus - 8,
  );
});

test("dominio de concepto y puntos débiles", () => {
  assert.deepEqual(
    conceptStanding({ answerCount: 0, recentAccuracy: null, dominatedQuestions: 0, questionCount: 4 }),
    { level: 0, few: true },
  );
  assert.deepEqual(
    conceptStanding({ answerCount: 2, recentAccuracy: 1, dominatedQuestions: 0, questionCount: 4 }),
    { level: 1, few: true },
  );
  assert.deepEqual(
    conceptStanding({ answerCount: 3, recentAccuracy: 1, dominatedQuestions: 2, questionCount: 4 }),
    { level: 2, few: false },
  );
  assert.equal(conceptStanding({
    answerCount: 3,
    recentAccuracy: 0.33,
    dominatedQuestions: 0,
    questionCount: 4,
  }).level, 0);
  assert.equal(isWeakConcept({ answerCount: 2, recentAccuracy: 0.69 }), true);
  assert.equal(isWeakConcept({ answerCount: 1, recentAccuracy: 0 }), false);
  assert.ok(weaknessRank(10, 0.69) > weaknessRank(2, 0.5));
});
