import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neutralizeValue } from "./publish-text.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const names = fs.existsSync(path.join(root, "sources", "privacy-needles.local.txt"))
  ? fs
      .readFileSync(path.join(root, "sources", "privacy-needles.local.txt"), "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  : [];
const studyPhrases = ["tu práctica", "tus prácticas", "tu carpeta", "tus apuntes", "tus intentos"];

function load(file) {
  const buf = fs.readFileSync(file);
  const html = buf.toString("utf8");
  const marker = html.indexOf("__DATA=");
  if (marker < 0) throw new Error("sin datos " + file);
  let raw = html.slice(marker + "__DATA=".length, html.indexOf("</script>", marker)).trim();
  if (raw.endsWith(";")) raw = raw.slice(0, -1);
  return JSON.parse(raw);
}

const source21 = path.join(root, "sources", "MiChuleta_DAM_2.1.html");
const source20 = path.join(root, "sources", "MiChuleta_DAM_2.0.html");
const data = load(source21);
const previous = load(source20);
const letters = "abcdefghijklmnopqrstuvwxyz";

const isolated = { items: [], notes: [] };
const items = [];
const seen = new Set();

function personal(value) {
  const text = JSON.stringify(value ?? "");
  return names.find((needle) => text.includes(needle)) || "";
}

function mentionsPractice(value) {
  const text = JSON.stringify(value ?? "");
  return studyPhrases.some((needle) => text.includes(needle));
}

for (const question of data.quiz) {
  const reason = [];
  if (!question || typeof question.id !== "string" || !/^[A-Za-z0-9_.-]{1,40}$/.test(question.id)) {
    reason.push("id no válido");
  } else if (seen.has(question.id)) reason.push("id repetido");
  if (!data.concepts[question.c]) reason.push("concepto ausente");
  const hit = personal(question);
  if (hit) reason.push("nombre personal: " + hit);
  if (reason.length) {
    isolated.items.push({ id: question?.id || null, reason, question });
    continue;
  }
  seen.add(question.id);
  const base = {
    id: question.id,
    subjectId: question.s,
    conceptId: question.c,
    subconceptId: question.sc || question.c,
    difficulty: question.d ?? null,
    stem: question.q,
    origin: question.src || null,
    note: question.note || null,
    verification: question.ver || null,
  };
  if (mentionsPractice(question)) base.localContext = true;
  if (question.k === "qa" || typeof question.a === "string") {
    items.push({ ...base, kind: "self-check", expectedAnswer: String(question.a ?? "") });
    continue;
  }
  if (!Array.isArray(question.o) || !Array.isArray(question.a) || question.o.length < 2 || question.o.length > 26) {
    isolated.items.push({ id: question.id, reason: ["opciones no utilizables"], question });
    seen.delete(question.id);
    continue;
  }
  items.push({
    ...base,
    kind: "multiple-choice",
    options: question.o.map((text, index) => {
      const letter = letters[index];
      const option = { letter, text: String(text) };
      const rationale = Array.isArray(question.ox) ? question.ox[index] : question.ox?.[letter];
      if (rationale) option.rationale = String(rationale);
      return option;
    }),
    correct: question.a.map(String),
    multiple: !!question.m,
    ...(question.code ? { code: question.code } : {}),
    presentsCode: !!question.cod,
    ...(question.w ? { generalRationale: question.w } : {}),
    ...(question.ej ? { example: question.ej } : {}),
    ...(question.tr ? { examHint: question.tr } : {}),
    ...(question.b ? { bankLabel: question.b } : {}),
  });
}

const subjects = (data.subjects || []).map((subject) => ({
  id: subject.id,
  name: subject.n || subject.name || subject.id,
  short: subject.s || subject.short || subject.id,
  description: personal(subject.d || "") ? "" : subject.d || "",
}));

const glossaries = (data.others || [])
  .map((row) => ({
    id: row.id,
    name: row.n || row.name || row.id,
    note: personal(row.d || "") ? "" : row.d || "",
  }))
  .filter((row) => row.id && !personal(row));

const concepts = Object.entries(data.concepts || {}).map(([id, concept]) => ({
  id,
  title: concept.n,
  topic: concept.t || "",
  confusion: concept.conf || "",
  subjectId: concept.s,
  terms: Array.isArray(concept.terms) ? concept.terms : [],
}));

const subconcepts = Object.entries(data.sc || {}).map(([id, row]) => ({
  id,
  title: row.n,
  conceptId: row.c,
}));

const JAVA = /^(col\.|poo\.|str\.|fic\.|json|jdbc|hib|file|fich)/i;
for (const concept of concepts) {
  concept.routes = ["fp.dam." + concept.subjectId];
  if (JAVA.test(concept.id)) concept.routes.push("pro.java");
}

const terms = [];
for (const entry of data.dic || []) {
  if (personal(entry)) {
    isolated.notes.push({ kind: "term", title: entry.t, reason: "dato personal" });
    continue;
  }
  terms.push({
    subjectId: entry.a,
    title: entry.t,
    topic: entry.g || "",
    definition: entry.d || "",
    analogy: entry.f || "",
    examHint: entry.e || "",
    snippet: entry.x || "",
  });
}

const knowledge = [];
for (const [id, card] of Object.entries(data.K || {})) {
  if (!card || typeof card !== "object" || personal(card)) {
    isolated.notes.push({ kind: "knowledge", id, reason: personal(card) ? "dato personal" : "forma desconocida" });
    continue;
  }
  knowledge.push({
    subconceptId: id,
    easy: typeof card.easy === "string" ? card.easy : "",
    example: typeof card.ex === "string" ? card.ex : "",
    compare: Array.isArray(card.cmp) ? card.cmp : null,
    traceId: typeof card.tr === "string" ? card.tr : "",
  });
}

const confusions = (data.confus || []).map((row, index) => ({
  id: row.k || `confus.${index + 1}`,
  title: row.t || "",
  subconceptIds: Array.isArray(row.scs) ? row.scs : [],
}));

const traces = Object.entries(data.traces || {}).map(([id, trace]) => ({ id, ...trace }));
const rules = (Array.isArray(data.rules) ? data.rules : data.reglas || [])
  .map((row, index) => {
    if (Array.isArray(row)) return { id: `rule.${index + 1}`, text: String(row[0] ?? ""), ref: String(row[1] ?? "") };
    if (typeof row === "string") return { id: `rule.${index + 1}`, text: row, ref: "" };
    return { id: row.id || `rule.${index + 1}`, text: String(row.t || row.text || ""), ref: String(row.sc || row.c || "") };
  })
  .filter((row) => {
    if (!personal(row)) return true;
    isolated.notes.push({ kind: "rule", id: row.id, reason: "nombre personal" });
    return false;
  });
const symptomPairs = (data.err || [])
  .map((row, index) => ({
    id: `err.${index + 1}`,
    symptom: Array.isArray(row) ? String(row[0] ?? "") : String(row?.symptom || ""),
    cause: Array.isArray(row) ? String(row[1] ?? "") : String(row?.cause || ""),
  }))
  .filter((row) => {
    if (!personal(row)) return true;
    isolated.notes.push({ kind: "symptom", id: row.id, reason: "dato personal" });
    return false;
  });

const previousIds = new Set(previous.quiz.map((question) => question.id));
const kept = items.filter((item) => previousIds.has(item.id)).length;

const bank = {
  bankVersion: 1,
  sourceVersion: data.ver || "2.1",
  sourceFile: "sources/MiChuleta_DAM_2.1.html",
  extractedAt: "2026-11-20",
  excluded: ["docs", "when", "how", "wl"],
  note: "Proyección del banco. Los apuntes HTML y el calendario personal no van en la aplicación.",
  subjects,
  glossaries,
  concepts,
  subconcepts,
  items,
  terms,
  knowledge,
  confusions,
  traces,
  rules,
  symptomPairs,
};

const published = neutralizeValue(bank);
for (const item of published.items) {
  if (!mentionsPractice(item)) delete item.localContext;
}

fs.mkdirSync(path.join(root, "content"), { recursive: true });
fs.writeFileSync(path.join(root, "content", "bank.json"), JSON.stringify(published));
fs.writeFileSync(path.join(root, "content", "isolated.json"), JSON.stringify(neutralizeValue(isolated), null, 2));

const bySubject = {};
for (const item of items) bySubject[item.subjectId] = (bySubject[item.subjectId] || 0) + 1;
const javaConcepts = concepts.filter((concept) => concept.routes.includes("pro.java")).map((concept) => concept.id);

console.log(
  JSON.stringify(
    {
      quizSource: data.quiz.length,
      items: items.length,
      isolated: isolated.items.length,
      keptFrom20: kept,
      concepts: concepts.length,
      subconcepts: subconcepts.length,
      terms: terms.length,
      knowledge: knowledge.length,
      confusions: confusions.length,
      traces: traces.length,
      rules: Array.isArray(rules) ? rules.length : 0,
      symptoms: symptomPairs.length,
      bySubject,
      javaConcepts,
      subjectKeys: data.subjects?.[0] ? Object.keys(data.subjects[0]) : [],
      knowledgeKeys: Object.keys(Object.values(data.K || {})[0] || {}),
      ruleSample: Array.isArray(rules) && rules[0] && typeof rules[0] === "object" ? Object.keys(rules[0]) : typeof rules[0],
      traceSample: traces[0] ? Object.keys(traces[0]).slice(0, 12) : [],
    },
    null,
    2,
  ),
);
