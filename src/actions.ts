import { bank, itemById, itemsForSubject } from "./bank";
import { examPreparation, scoreLabel, scoreQuestion, selectQuestions } from "../engine/learning21.mjs";
import { simulationGrade } from "../engine/learning.mjs";
import {
  clearResume,
  confirmImport,
  cancelImport,
  dismissNotice,
  exportText,
  getCorrupt,
  getProgress,
  model,
  recordAnswer,
  recordSimulation,
  setFlash,
  setResume,
  stageImport,
  patchSettings,
  clearCorrupt,
} from "./store";

function sample<T>(list: T[], count: number) {
  const copy = list.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy.slice(0, count);
}

function go(hash: string) {
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent("hashchange"));
  else location.hash = hash;
}

export function begin(mode: string, ids: string[], subjectId: string, why: Record<string, string> = {}, cfg: any = null) {
  if (!ids.length) {
    setFlash("No hay preguntas para esa selección.");
    return;
  }
  setResume({
    mode,
    subjectId,
    ids,
    index: 0,
    answers: {},
    stage: "q",
    cfg,
    startedAt: Date.now(),
    why,
    retries: {},
    results: null,
  });
  go("#/sesion");
}

function selectedLetters() {
  return [...document.querySelectorAll<HTMLInputElement>("#ops input:checked")].map((input) => input.value);
}

function current() {
  const resume = getProgress().resume;
  if (!resume) return null;
  const index = resume.index || 0;
  const id = resume.ids[index];
  return { resume, index, id, item: itemById(id) };
}

export function handle(act: string, node: HTMLElement) {
  if (act === "dismiss") dismissNotice(node.dataset.id || "");
  else if (act === "theme") cycleTheme();
  else if (act === "preview-legacy") stageImport(localStorage.getItem("mcdam2.progress") || "");
  else if (act === "confirm-import") confirmImport();
  else if (act === "cancel-import") cancelImport();
  else if (act === "export") download("programate-progreso.json", exportText());
  else if (act === "download-corrupt") {
    download("programate-progreso-danado.txt", getCorrupt() || "");
    clearCorrupt();
  } else if (act === "save-goal") saveGoal();
  else if (act === "start-next") startNext(node.dataset.kind || "learn");
  else if (act === "start-due") startDue();
  else if (act === "start-weak") startWeak(node.dataset.id || "");
  else if (act === "learn-concept") startConcept(node.dataset.id || "");
  else if (act === "start-practice") startPractice();
  else if (act === "start-sim") startSim();
  else if (act === "forget") {
    clearResume();
    go("#/");
  } else if (act === "check") check(false);
  else if (act === "blank") check(true);
  else if (act === "next") advance();
  else if (act === "reveal-qa") revealQa();
  else if (act === "qa-yes") gradeQa("o");
  else if (act === "qa-no") gradeQa("k");
  else if (act === "sim-next") simStore(true);
  else if (act === "sim-review") simStore(false);
  else if (act === "sim-goto") jump(Number(node.dataset.i || 0));
  else if (act === "sim-back") {
    const resume = getProgress().resume;
    if (resume) setResume({ ...resume, stage: "q" });
  } else if (act === "sim-submit") submitSim();
  else if (act === "review-session-errors") reviewErrors();
}

function cycleTheme() {
  const order = ["system", "light", "dark"];
  const current = getProgress().settings.theme || "system";
  const next = order[(order.indexOf(current) + 1) % order.length];
  patchSettings({ theme: next });
}

function saveGoal() {
  const input = document.querySelector<HTMLInputElement>("#goal");
  const value = Number(input?.value || 30);
  patchSettings({ dailyGoal: Math.max(10, Math.min(200, value || 30)) });
  setFlash("Objetivo guardado.");
}

function poolFor(subjectId: string, conceptId = "") {
  return bank.items.filter(
    (item) => item.kind === "multiple-choice" && item.subjectId === subjectId && (!conceptId || item.conceptId === conceptId),
  );
}

function startNext(kind: string) {
  if (kind === "due") startDue();
  else if (kind === "errors") startErrors();
  else if (kind === "weak") {
    const { summary } = model();
    const weak = Object.values(summary.subconcepts as Record<string, any>).find(
      (sub) => sub.real?.length >= 2 && sub.recentAccuracy < 0.7,
    );
    if (weak) startWeak(weak.id);
    else startConcept(bank.concepts.find((concept) => concept.subjectId === "ad")?.id || "");
  } else if (kind === "sim") go("#/simulacro");
  else startAdaptive("ad", "", 10, "learn");
}

function startDue() {
  const { states, summary } = model();
  const due = bank.items.filter((item) => states[item.id]?.n && states[item.id].due <= Date.now());
  const picked = selectQuestions(due, states, summary, Math.min(20, due.length), { random: () => 0 });
  begin("due", picked.questions.map((item: any) => item.id), "ad", picked.why);
}

function startErrors() {
  const { states } = model();
  const ids = bank.items
    .filter((item) => states[item.id]?.n && (states[item.id].pend || states[item.id].lastRes !== "o"))
    .map((item) => item.id);
  begin("errors", sample(ids, 15), "ad");
}

function startWeak(subconceptId: string) {
  const { states, summary } = model();
  const pool = bank.items.filter((item) => item.kind === "multiple-choice" && item.subconceptId === subconceptId);
  const picked = selectQuestions(pool, states, summary, Math.min(8, pool.length), { random: () => 0 });
  begin("practice", picked.questions.map((item: any) => item.id), pool[0]?.subjectId || "ad", picked.why);
}

function startConcept(conceptId: string) {
  const concept = bank.concepts.find((row) => row.id === conceptId);
  if (!concept) return;
  startAdaptive(concept.subjectId, conceptId, 8, "learn");
}

function startAdaptive(subjectId: string, conceptId: string, count: number, mode: string) {
  const { states, summary } = model();
  const pool = poolFor(subjectId, conceptId);
  const picked = selectQuestions(pool, states, summary, Math.min(count, pool.length));
  begin(mode, picked.questions.map((item: any) => item.id), subjectId, picked.why);
}

function startPractice() {
  const subjectId = document.querySelector<HTMLSelectElement>("#practice-subject")?.value || "ad";
  const conceptId = document.querySelector<HTMLSelectElement>("#practice-concept")?.value || "";
  const count = Number(document.querySelector<HTMLSelectElement>("#practice-count")?.value || 10);
  startAdaptive(subjectId, conceptId, count, "practice");
}

function startSim() {
  const count = Number(document.querySelector<HTMLSelectElement>("#sim-count")?.value || 20);
  const pen = document.querySelector<HTMLSelectElement>("#sim-pen")?.value !== "0";
  const multi = document.querySelector<HTMLSelectElement>("#sim-multi")?.value || "prop";
  patchSettings({ scoring: { pen, multi } });
  const pool = itemsForSubject("ad").filter((item) => item.kind === "multiple-choice");
  begin("sim", sample(pool, count).map((item) => item.id), "ad", {}, { pen, multi });
}

function answerKey(resume: any, itemId: string, index: number) {
  return resume.mode === "sim" ? itemId : `${itemId}#${index}`;
}

function check(blank: boolean) {
  const cursor = current();
  if (!cursor?.item || cursor.item.kind !== "multiple-choice") return;
  const sel = blank ? [] : selectedLetters();
  if (!sel.length && !blank) {
    setFlash("Marca una opción o pulsa «No lo sé».");
    return;
  }
  const scored = scoreQuestion(cursor.item, sel, { pen: false, multi: "none" });
  const retries = cursor.resume.retries?.[cursor.item.id] || 0;
  const rt = retries > 0;
  recordAnswer(cursor.item, scored.r, scored.r === "o" ? 1 : 0, cursor.resume.mode === "due" ? "due" : "apr", rt, false);
  const answers = { ...cursor.resume.answers, [answerKey(cursor.resume, cursor.item.id, cursor.index)]: { sel, ...scored, done: 1, rt } };
  const nextRetries = { ...cursor.resume.retries };
  let ids = cursor.resume.ids;
  if (cursor.resume.mode === "errors" && scored.r !== "o") {
    nextRetries[cursor.item.id] = retries + 1;
    if (nextRetries[cursor.item.id] <= 3) ids = ids.slice(0, cursor.index + 1).concat(cursor.item.id, ids.slice(cursor.index + 1));
  }
  setResume({ ...cursor.resume, answers, retries: nextRetries, ids });
}

function revealQa() {
  const cursor = current();
  if (!cursor?.item) return;
  const answers = { ...cursor.resume.answers, [answerKey(cursor.resume, cursor.item.id, cursor.index)]: { shown: 1 } };
  setResume({ ...cursor.resume, answers });
}

function gradeQa(result: string) {
  const cursor = current();
  if (!cursor?.item) return;
  const retries = cursor.resume.retries?.[cursor.item.id] || 0;
  recordAnswer(cursor.item, result, result === "o" ? 1 : 0, "apr", retries > 0, true);
  const key = answerKey(cursor.resume, cursor.item.id, cursor.index);
  const answers = { ...cursor.resume.answers, [key]: { ...cursor.resume.answers[key], r: result, done: 1 } };
  setResume({ ...cursor.resume, answers });
}

function advance() {
  const resume = getProgress().resume;
  if (!resume) return;
  if ((resume.index || 0) + 1 >= resume.ids.length) finishPractice(resume);
  else setResume({ ...resume, index: resume.index + 1 });
}

function finishPractice(resume: any) {
  const rows = resume.ids.map((id: string, index: number) => resume.answers[`${id}#${index}`]).filter(Boolean);
  const results = {
    ok: rows.filter((row: any) => row.r === "o").length,
    ko: rows.filter((row: any) => row.r === "k").length,
    bl: rows.filter((row: any) => row.r === "b" || !row.r).length,
    wrongIds: resume.ids.filter((id: string, index: number) => resume.answers[`${id}#${index}`]?.r && resume.answers[`${id}#${index}`].r !== "o"),
  };
  setResume({ ...resume, stage: "done", results });
}

function simStore(advanceNext: boolean) {
  const cursor = current();
  if (!cursor?.item) return;
  const sel = selectedLetters();
  const answers = { ...cursor.resume.answers, [cursor.item.id]: { sel } };
  const atEnd = cursor.index + 1 >= cursor.resume.ids.length;
  setResume({
    ...cursor.resume,
    answers,
    index: advanceNext && !atEnd ? cursor.index + 1 : cursor.index,
    stage: !advanceNext || atEnd ? "confirm" : "q",
  });
}

function jump(index: number) {
  const resume = getProgress().resume;
  if (!resume) return;
  setResume({ ...resume, index, stage: "q" });
}

function submitSim() {
  const resume = getProgress().resume;
  if (!resume) return;
  const cfg = resume.cfg || { pen: true, multi: "prop" };
  const rows = resume.ids.map((id: string) => {
    const question = itemById(id);
    const sel = resume.answers?.[id]?.sel || [];
    const scored = question ? scoreQuestion(question, sel, cfg) : { r: "b", sc: 0, note: "" };
    return { question, ...scored, id };
  });
  const grade = simulationGrade(rows.map((row: any) => row.sc));
  const hasMulti = rows.some((row: any) => (row.question?.correct || []).length > 1 || row.question?.multiple);
  const label = scoreLabel("ad", cfg, hasMulti);
  const sim = {
    t: Date.now(),
    subjectId: "ad",
    kind: "sim",
    n: grade.n,
    score: grade.score,
    grade: grade.grade,
    ok: rows.filter((row: any) => row.r === "o").length,
    ko: rows.filter((row: any) => row.r === "k").length,
    bl: rows.filter((row: any) => row.r === "b").length,
    cfg: { ...cfg, lab: label.lab },
    items: rows.map((row: any) => ({ id: row.id, conceptId: row.question?.conceptId || "", r: row.r, sc: row.sc })),
  };
  recordSimulation(
    sim,
    rows.filter((row: any) => row.question).map((row: any) => ({ question: row.question, result: row.r, points: row.sc })),
  );
  const prep = examPreparation(getProgress().sims, "ad", bank.concepts.filter((concept) => concept.subjectId === "ad").length);
  setResume({
    ...resume,
    stage: "done",
    results: {
      ok: sim.ok,
      ko: sim.ko,
      bl: sim.bl,
      score: sim.score,
      grade: sim.grade,
      label: `${label.text} ${prep.message}`,
      wrongIds: rows.filter((row: any) => row.r !== "o").map((row: any) => row.id),
    },
  });
}

function reviewErrors() {
  const resume = getProgress().resume;
  const ids = resume?.results?.wrongIds || [];
  begin("errors", ids, resume?.subjectId || "ad");
}

export function download(name: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function readImport(file: File) {
  const reader = new FileReader();
  reader.onload = () => {
    stageImport(String(reader.result || ""));
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };
  reader.onerror = () => setFlash("No he podido leer el archivo. El progreso no ha cambiado.");
  reader.readAsText(file);
}
