import { bank, type Item } from "./bank";
import { derive, ymd } from "../engine/learning.mjs";
import { summarize } from "../engine/learning21.mjs";
import {
  CORRUPT_KEY,
  STORAGE_KEY,
  emptyProgress,
  parseImport,
  readStored,
  serializeProgress,
} from "../engine/progress-file.mjs";
import { collectAchievements, touchStreak, xpForAnswer } from "../engine/xp.mjs";

export type Progress = ReturnType<typeof emptyProgress>;

let progress: Progress = emptyProgress();
let notices: { id: string; text: string }[] = [];
let pending: { progress: Progress; warnings: string[] } | null = null;
let corrupt: string | null = null;
let flash = "";

function save() {
  progress.updated = Date.now();
  localStorage.setItem(STORAGE_KEY, serializeProgress(progress));
  document.documentElement.dataset.theme = progress.settings.theme;
}

export function boot() {
  const read = readStored(localStorage.getItem(STORAGE_KEY));
  progress = read.progress;
  notices = read.warnings.map((text: string, index: number) => ({ id: `boot-${index}`, text }));
  if (read.corrupt) {
    corrupt = read.corrupt;
    localStorage.setItem(CORRUPT_KEY, read.corrupt);
  } else {
    corrupt = localStorage.getItem(CORRUPT_KEY);
  }
  document.documentElement.dataset.theme = progress.settings.theme || "system";
}

export function getProgress() {
  return progress;
}

export function getNotices() {
  return notices;
}

export function dismissNotice(id: string) {
  notices = notices.filter((notice) => notice.id !== id);
  if (id === "legacy") localStorage.setItem("programate.dismiss-chuleta", "1");
}

export function getPending() {
  return pending;
}

export function getCorrupt() {
  return corrupt;
}

export function clearCorrupt() {
  corrupt = null;
  localStorage.removeItem(CORRUPT_KEY);
}

export function setFlash(text: string) {
  flash = text;
}

export function consumeFlash() {
  const text = flash;
  flash = "";
  return text;
}

export function model() {
  const derived = derive(progress.log);
  const summary = summarize(progress.log, bank.items);
  const before = progress.achievements.length;
  collectAchievements(progress, summary);
  if (progress.achievements.length !== before) save();
  return { progress, states: derived.q as Record<string, any>, days: derived.days as Record<string, any>, summary };
}

function pushEvent(question: Item, result: string, points: number, mode: string, immediateRetry: boolean, selfCheck: boolean) {
  const now = Date.now();
  const before = derive(progress.log).q[question.id];
  const day = ymd(now);
  const alreadyCorrectToday = progress.log.some(
    (event: any) => event.id === question.id && event.r === "o" && !event.rt && ymd(event.t) === day,
  );
  const sameDayAfterFail = !!(before && before.pend && before.failDay === day);
  let stamp = now;
  while (progress.log.some((event: any) => event.t === stamp && event.id === question.id)) stamp += 1;
  const event: any = {
    t: stamp,
    id: question.id,
    r: result,
    m: mode,
    sc: points,
    s: question.subjectId,
    c: question.conceptId,
  };
  if (immediateRetry) event.rt = 1;
  if (selfCheck) event.sf = 1;
  progress.log.push(event);
  if (progress.log.length > 10000) {
    const extra = progress.log.splice(0, progress.log.length - 10000);
    progress.overflow = progress.overflow.concat(extra);
    notices.push({
      id: "cap",
      text: "El cálculo usa las últimas 10.000 respuestas. Las anteriores siguen en la copia exportada.",
    });
  }
  const gained = xpForAnswer({
    result,
    immediateRetry,
    sameDayAfterFail,
    alreadyCorrectToday,
  });
  progress.xp += gained;
  progress.xpByDay[day] = (progress.xpByDay[day] || 0) + gained;
  touchStreak(progress, now);
  return gained;
}

export function recordAnswer(question: Item, result: string, points: number, mode: string, immediateRetry: boolean, selfCheck = false) {
  const gained = pushEvent(question, result, points, mode, immediateRetry, selfCheck);
  save();
  return gained;
}

export function recordSimulation(sim: any, rows: { question: Item; result: string; points: number }[]) {
  for (const row of rows) pushEvent(row.question, row.result, row.points, "sim", false, row.question.kind === "self-check");
  progress.sims.push(sim);
  if (progress.sims.length > 100) {
    const extra = progress.sims.splice(0, progress.sims.length - 100);
    progress.overflowSims = (progress.overflowSims || []).concat(extra);
  }
  save();
}

export function setResume(resume: any) {
  progress.resume = resume;
  save();
}

export function clearResume() {
  progress.resume = null;
  save();
}

export function patchSettings(partial: any) {
  progress.settings = { ...progress.settings, ...partial };
  if (partial.scoring) progress.settings.scoring = { ...progress.settings.scoring, ...partial.scoring };
  save();
}

export function stageImport(text: string) {
  const result = parseImport(text);
  if (!result.ok) {
    notices.push({ id: `bad-${Date.now()}`, text: result.reason });
    return false;
  }
  pending = { progress: result.progress, warnings: result.warnings || [] };
  return true;
}

export function confirmImport() {
  if (!pending) return;
  progress = pending.progress;
  pending = null;
  save();
}

export function cancelImport() {
  pending = null;
}

export function legacyAvailable() {
  return !progress.log.length && !!localStorage.getItem("mcdam2.progress") && localStorage.getItem("programate.dismiss-chuleta") !== "1";
}

export function exportText() {
  return serializeProgress(progress);
}
