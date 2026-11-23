import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";
import originalBank from "../content/bank.json" with { type: "json" };
import { derive, isDue } from "../engine/learning.mjs";
import { scoreQuestion, summarize } from "../engine/learning21.mjs";
import { xpForAnswer } from "../engine/xp.mjs";

const server = await createServer({
  server: { hmr: false, watch: null, ws: false },
  configFile: false,
  appType: "custom",
});
after(() => server.close());

const { bank, itemById, itemsForSubject } = await server.ssrLoadModule("/src/bank.ts");
const { JAVA_SUBJECT, units } = await server.ssrLoadModule("/src/java.ts");
const questions = itemsForSubject(JAVA_SUBJECT);

test("el piloto conserva las 305 preguntas y añade identificadores y soluciones coherentes", () => {
  assert.equal(originalBank.items.length, 305);
  assert.deepEqual(bank.items.slice(0, 305), originalBank.items);
  assert.equal(units.length, 15);
  assert.equal(questions.length, 15);
  assert.equal(new Set(bank.items.map(({ id }) => id)).size, bank.items.length);
  for (const item of questions) {
    assert.equal(itemById(item.id), item);
    assert.equal(item.options.length, 3);
    assert.equal(item.correct.length, 1);
    assert.ok(bank.concepts.some(({ id }) => id === item.conceptId));
    assert.ok(item.examHint && item.generalRationale);
    assert.equal(scoreQuestion(item, item.correct, { pen: false, multi: "none" }).r, "o");
    assert.equal(scoreQuestion(item, item.options.filter(({ letter }) => !item.correct.includes(letter)).slice(0, 1).map(({ letter }) => letter), { pen: false, multi: "none" }).r, "k");
  }
});

test("el motor mantiene la cola de repaso y excluye el reintento inmediato del dominio y la XP", () => {
  const [first, second] = questions;
  const dayOne = new Date(2027, 0, 4, 12).getTime();
  const dayTwo = new Date(2027, 0, 5, 12).getTime();
  const event = (item, t, r, rt = undefined) => ({ id: item.id, t, r, rt, m: "apr", sc: r === "o" ? 1 : 0 });
  const failure = [event(first, dayOne, "k"), event(first, dayOne + 1, "o", 1)];
  assert.equal(summarize(failure, questions).subconcepts[first.subconceptId].level, 1);
  assert.equal(isDue(derive(failure).q[first.id], dayTwo + 1), true);
  assert.equal(xpForAnswer({ result: "o", immediateRetry: true }), 0);
  assert.equal(xpForAnswer({ result: "o", alreadyCorrectToday: true }), 0);
  const mastery = [event(first, dayOne, "o"), event(second, dayOne + 1, "o"), event(first, dayTwo, "o")];
  assert.equal(summarize(mastery, questions).subconcepts[first.subconceptId].level, 3);
});
