import assert from "node:assert/strict";
import test from "node:test";
import { DAY_MS, applyAnswer, blankState, derive } from "./learning.mjs";
import {
  examPreparation,
  recommendNext,
  recurringConfusions,
  scoreLabel,
  scoreQuestion,
  selectQuestions,
  summarize,
  weakSubconcepts,
} from "./learning21.mjs";

const noon = (year, monthIndex, day) => new Date(year, monthIndex, day, 12).getTime();

const item = (id, extra = {}) => ({
  id,
  kind: "multiple-choice",
  subjectId: "ad",
  conceptId: "col.elegir",
  subconceptId: "col.list",
  options: [
    { letter: "a", text: "A" },
    { letter: "b", text: "B" },
    { letter: "c", text: "C" },
  ],
  correct: ["a"],
  multiple: false,
  ...extra,
});

test("un acierto el mismo día del fallo no sube la caja", () => {
  const day = noon(2026, 10, 20);
  const state = blankState();
  applyAnswer(state, "k", day);
  assert.equal(state.box, 0);
  assert.equal(state.pend, 1);
  applyAnswer(state, "o", day + 1000);
  assert.equal(state.box, 0);
  assert.equal(state.pend, 1);
  assert.equal(state.rtok, 1);
  const next = noon(2026, 10, 21);
  applyAnswer(state, "o", next);
  assert.equal(state.box, 1);
  assert.equal(state.pend, 0);
});

test("un reintento inmediato no sube la caja aunque ya no conste el fallo de hoy", () => {
  const state = blankState();
  applyAnswer(state, "o", noon(2026, 10, 20), true);
  assert.equal(state.box, 0);
  assert.equal(state.rtok, 1);
});

test("la puntuación de AD única resta 0,33 y la práctica no", () => {
  const q = item("ad01");
  assert.equal(scoreQuestion(q, ["b"]).sc, -0.33);
  assert.equal(scoreQuestion(q, ["b"], { pen: false, multi: "prop" }).sc, 0);
  const other = item("di1", { subjectId: "di" });
  assert.equal(scoreQuestion(other, ["b"]).sc, 0);
  const multi = item("ad02", { correct: ["a", "b"], multiple: true });
  assert.equal(scoreQuestion(multi, ["a"], { pen: true, multi: "minus1" }).sc, -1);
  assert.equal(scoreLabel("ad", { pen: true, multi: "prop" }, true).lab, "assumed");
  assert.equal(scoreLabel("ad", { pen: true, multi: "prop" }, false).lab, "conf");
  assert.equal(scoreLabel("di", { pen: true, multi: "prop" }, false).lab, "practice");
});

test("el dominio fino ignora el reintento y exige dos días", () => {
  const questions = [item("q1"), item("q2")];
  const day1 = noon(2026, 10, 20);
  const day2 = noon(2026, 10, 21);
  const log = [
    { t: day1, id: "q1", r: "o" },
    { t: day1 + 1, id: "q1", r: "o", rt: 1 },
    { t: day1 + 2, id: "q2", r: "o" },
    { t: day2, id: "q1", r: "o" },
    { t: day2 + 1, id: "q2", r: "o" },
    { t: day2 + 2, id: "q2", r: "o" },
  ];
  const summary = summarize(log, questions);
  const sub = summary.subconcepts["col.list"];
  assert.equal(sub.real.length, 5);
  assert.equal(sub.level, 3);
  const onlyRetry = summarize([{ t: day1, id: "q1", r: "o", rt: 1 }], questions);
  assert.equal(onlyRetry.subconcepts["col.list"].level, 1);
  assert.equal(onlyRetry.subconcepts["col.list"].real.length, 0);
});

test("un concepto flojo se ordena por el fallo reciente", () => {
  const questions = [item("q1"), item("q2", { subconceptId: "col.set", conceptId: "col.elegir" })];
  const t = noon(2026, 10, 20);
  const log = [
    { t, id: "q1", r: "k" },
    { t: t + 1, id: "q1", r: "k" },
    { t: t + 2, id: "q2", r: "o" },
    { t: t + 3, id: "q2", r: "k" },
  ];
  const weak = weakSubconcepts(summarize(log, questions));
  assert.equal(weak[0].id, "col.list");
  assert.equal(weak.length, 2);
});

test("la preparación de examen ignora el repaso de errores y la práctica suelta", () => {
  assert.equal(examPreparation([], "ad", 4).state, "sin");
  const one = examPreparation(
    [{ t: 1, subjectId: "ad", kind: "sim", grade: 6, items: [{ conceptId: "col.elegir" }] }],
    "ad",
    4,
  );
  assert.equal(one.state, "poco");
  const withErrorDrill = examPreparation(
    [
      { t: 1, subjectId: "ad", kind: "err", grade: 10, items: [] },
      { t: 2, subjectId: "ad", kind: "sim", grade: 5, items: [{ conceptId: "a" }] },
      { t: 3, subjectId: "ad", kind: "sim", grade: 7, items: [{ conceptId: "b" }] },
    ],
    "ad",
    4,
  );
  assert.equal(withErrorDrill.n, 2);
  assert.equal(withErrorDrill.state, "orient");
  assert.equal(withErrorDrill.last, 7);
  assert.equal(withErrorDrill.trend, 2);
});

test("la recomendación prioriza el repaso vencido sobre un concepto flojo", () => {
  assert.equal(recommendNext({ logLength: 0, dueCount: 0, pendingCount: 0, weakName: "", unseenCount: 10 }).kind, "learn");
  assert.equal(recommendNext({ logLength: 4, dueCount: 2, pendingCount: 3, weakName: "Listas", unseenCount: 1 }).kind, "due");
  assert.equal(recommendNext({ logLength: 4, dueCount: 0, pendingCount: 0, weakName: "", unseenCount: 0 }).kind, "sim");
});

test("una confusión recurrente mira 21 días y no cuenta reintentos", () => {
  const questions = [item("q1"), item("q2", { subconceptId: "col.set" })];
  const now = noon(2026, 10, 20);
  const log = [
    { t: now - 30 * DAY_MS, id: "q1", r: "k" },
    { t: now - DAY_MS, id: "q1", r: "k" },
    { t: now - 1000, id: "q2", r: "k", rt: 1 },
    { t: now, id: "q2", r: "k" },
  ];
  const flagged = recurringConfusions(
    log,
    questions,
    [{ id: "c1", title: "Lista o conjunto", subconceptIds: ["col.list", "col.set"] }],
    now,
  );
  assert.equal(flagged.length, 1);
  assert.equal(flagged[0].total, 2);
});

test("el selector no elige al azar si el generador es fijo y hay un error pendiente", () => {
  const questions = [item("due"), item("fresh", { subconceptId: "col.set" })];
  const state = blankState();
  applyAnswer(state, "k", noon(2026, 10, 20));
  const states = { due: state };
  const summary = summarize([{ t: noon(2026, 10, 20), id: "due", r: "k" }], questions);
  const picked = selectQuestions(questions, states, summary, 1, { random: () => 0, now: noon(2026, 10, 21) });
  assert.equal(picked.questions[0].id, "due");
  assert.equal(derive([{ t: 1, id: "due", r: "k" }]).q.due.pend, 1);
});
