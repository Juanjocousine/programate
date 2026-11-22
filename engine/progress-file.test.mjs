import assert from "node:assert/strict";
import test from "node:test";
import { emptyProgress, parseImport, readStored, sanitizeProgress } from "./progress-file.mjs";
import { collectAchievements, levelFromXp, touchStreak, xpForAnswer } from "./xp.mjs";

test("un JSON roto no sustituye el progreso", () => {
  const read = readStored("{esto no");
  assert.equal(read.progress.log.length, 0);
  assert.equal(typeof read.corrupt, "string");
  assert.equal(read.warnings.length, 1);
});

test("una respuesta ilegible se aparta y el resto se conserva", () => {
  const result = sanitizeProgress({
    app: "programate",
    log: [
      { t: 1, id: "ad01", r: "o", sc: 1 },
      { t: 2, id: "con espacios", r: "o" },
      { t: 3, id: "ad02", r: "z" },
    ],
    settings: { scoring: { pen: true, multi: "prop" } },
  });
  assert.equal(result.ok, true);
  assert.equal(result.progress.log.length, 1);
  assert.equal(result.progress.quarantine.length, 2);
});

test("importar la chuleta copia el registro y no inventa experiencia", () => {
  const result = parseImport(
    JSON.stringify({
      v: 3,
      log: [{ t: 10, id: "ad01", r: "k", sc: -0.33, s: "ad", c: "col.elegir" }],
      sims: [{ t: 20, subj: "ad", kind: "sim", n: 2, score: 1, grade: 5, items: [{ id: "ad01", r: "o", sc: 1 }] }],
    }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.source, "chuleta");
  assert.equal(result.progress.log[0].id, "ad01");
  assert.equal(result.progress.sims[0].subjectId, "ad");
  assert.equal(result.progress.xp, 0);
});

test("un archivo vacío de campos útiles se rechaza", () => {
  const result = parseImport(JSON.stringify({ hola: true }));
  assert.equal(result.ok, false);
  const fresh = emptyProgress();
  assert.equal(fresh.v, 1);
  assert.equal(fresh.log.length, 0);
});

test("la experiencia no premia el mismo acierto de hoy ni el reintento", () => {
  assert.equal(xpForAnswer({ result: "o", immediateRetry: false, sameDayAfterFail: false, alreadyCorrectToday: false }), 10);
  assert.equal(xpForAnswer({ result: "o", immediateRetry: true, sameDayAfterFail: false, alreadyCorrectToday: false }), 0);
  assert.equal(xpForAnswer({ result: "o", immediateRetry: false, sameDayAfterFail: true, alreadyCorrectToday: false }), 0);
  assert.equal(xpForAnswer({ result: "k", immediateRetry: false, sameDayAfterFail: false, alreadyCorrectToday: false }), 0);
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(50), 2);
});

test("la racha solo cuenta un día si se cumple el objetivo y no resta puntos", () => {
  const progress = emptyProgress(new Date(2026, 10, 20, 12).getTime());
  progress.xpByDay["2026-11-20"] = 30;
  touchStreak(progress, new Date(2026, 10, 20, 18).getTime());
  assert.equal(progress.streak.count, 1);
  progress.xpByDay["2026-11-22"] = 30;
  touchStreak(progress, new Date(2026, 10, 22, 12).getTime());
  assert.equal(progress.streak.count, 1);
  assert.equal(progress.xp, 0);
});

test("el logro de dominio no se desbloquea con un nivel intermedio", () => {
  const progress = emptyProgress();
  progress.log.push({ t: 1, id: "ad01", r: "o" });
  collectAchievements(progress, { subconcepts: { a: { level: 2 } } });
  assert.equal(progress.achievements.includes("subconcept-mastered"), false);
  assert.equal(progress.achievements.includes("first-correct"), true);
});
