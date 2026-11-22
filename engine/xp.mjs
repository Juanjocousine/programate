/**
 * Capa corta de motivación. No suma puntos por repetir hoy la misma pregunta
 * ni por acertarla justo después de fallarla.
 */

import { ymd, DAY_MS } from "./learning.mjs";

export const XP_PER_LEVEL = 50;

export function xpForAnswer({ result, immediateRetry, sameDayAfterFail, alreadyCorrectToday }) {
  if (result !== "o") return 0;
  if (immediateRetry || sameDayAfterFail || alreadyCorrectToday) return 0;
  return 10;
}

export function levelFromXp(xp) {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

export function xpIntoLevel(xp) {
  return Math.max(0, xp) % XP_PER_LEVEL;
}

export function touchStreak(progress, now) {
  const day = ymd(now);
  const goal = progress.settings?.dailyGoal || 30;
  const today = progress.xpByDay?.[day] || 0;
  if (today < goal) return progress;
  if (progress.streak.lastDay === day) return progress;
  const yesterday = ymd(now - DAY_MS);
  progress.streak.count = progress.streak.lastDay === yesterday ? progress.streak.count + 1 : 1;
  progress.streak.lastDay = day;
  return progress;
}

export function collectAchievements(progress, summary) {
  const have = new Set(progress.achievements || []);
  const add = (id, when) => {
    if (when && !have.has(id)) have.add(id);
  };
  add("first-answer", progress.log.length > 0);
  add("first-correct", progress.log.some((event) => event.r === "o" && !event.rt));
  add("first-sim", progress.sims.some((sim) => sim.kind !== "err"));
  add("streak-3", (progress.streak?.count || 0) >= 3);
  add(
    "subconcept-mastered",
    Object.values(summary?.subconcepts || {}).some((sub) => sub.level === 3),
  );
  progress.achievements = [...have];
  return progress.achievements;
}

export const ACHIEVEMENT_LABELS = {
  "first-answer": "Primera respuesta",
  "first-correct": "Primer acierto que cuenta",
  "first-sim": "Primer simulacro",
  "streak-3": "Tres días seguidos con el objetivo",
  "subconcept-mastered": "Un concepto fino dominado en días distintos",
};
