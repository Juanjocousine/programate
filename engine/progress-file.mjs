/**
 * Progreso local de Programate, versión 1.
 * El contenido educativo no vive aquí. Si un dato no pasa la comprobación,
 * se aparta en `quarantine` y se avisa: no se tira.
 */

export const PROGRESS_VERSION = 1;
export const STORAGE_KEY = "programate.progress";
export const CORRUPT_KEY = "programate.progress.corrupt";
const LOG_CAP = 10000;
const ID_OK = /^[A-Za-z0-9_.-]{1,40}$/;
const RESULTS = new Set(["o", "k", "b"]);
const MULTIS = new Set(["prop", "minus1", "none"]);

export function emptyProgress(now = Date.now()) {
  return {
    v: PROGRESS_VERSION,
    app: "programate",
    created: now,
    updated: now,
    log: [],
    sims: [],
    resume: null,
    settings: { scoring: { pen: true, multi: "prop" }, dailyGoal: 30, theme: "system" },
    xp: 0,
    xpByDay: {},
    streak: { count: 0, lastDay: "" },
    achievements: [],
    quarantine: [],
    overflow: [],
    overflowSims: [],
  };
}

function cleanEvent(event) {
  if (!event || typeof event !== "object") return null;
  if (!ID_OK.test(event.id || "")) return null;
  if (!RESULTS.has(event.r)) return null;
  if (!Number.isFinite(event.t)) return null;
  const clean = {
    t: event.t,
    id: event.id,
    r: event.r,
    m: typeof event.m === "string" ? event.m.slice(0, 12) : "apr",
    sc: Number.isFinite(event.sc) ? Math.max(-1, Math.min(1, event.sc)) : event.r === "o" ? 1 : 0,
  };
  if (event.rt) clean.rt = 1;
  if (event.sf) clean.sf = 1;
  if (typeof event.s === "string") clean.s = event.s.slice(0, 20);
  if (typeof event.c === "string") clean.c = event.c.slice(0, 40);
  return clean;
}

function cleanSim(sim) {
  if (!sim || typeof sim !== "object" || !Number.isFinite(sim.t)) return null;
  const subjectId = sim.subjectId || sim.subj;
  if (typeof subjectId !== "string" || !subjectId) return null;
  return {
    t: sim.t,
    subjectId,
    kind: sim.kind === "err" ? "err" : "sim",
    n: Number(sim.n) || 0,
    score: Number(sim.score) || 0,
    grade: Number(sim.grade) || 0,
    ok: Number(sim.ok) || 0,
    ko: Number(sim.ko) || 0,
    bl: Number(sim.bl) || 0,
    cfg: sim.cfg && typeof sim.cfg === "object" ? sim.cfg : null,
    items: Array.isArray(sim.items)
      ? sim.items
          .filter((item) => item && ID_OK.test(item.id || ""))
          .map((item) => ({
            id: item.id,
            conceptId: typeof item.conceptId === "string" ? item.conceptId : item.c || "",
            r: RESULTS.has(item.r) ? item.r : "b",
            sc: Number.isFinite(item.sc) ? item.sc : 0,
          }))
      : [],
  };
}

function cleanSettings(settings) {
  const scoring = settings?.scoring || {};
  const theme = settings?.theme;
  return {
    scoring: {
      pen: scoring.pen !== false,
      multi: MULTIS.has(scoring.multi) ? scoring.multi : "prop",
    },
    dailyGoal: Number.isFinite(settings?.dailyGoal) ? Math.max(10, Math.min(200, settings.dailyGoal)) : 30,
    theme: theme === "light" || theme === "dark" ? theme : "system",
  };
}

function takeLog(events, quarantine) {
  const log = [];
  for (const event of events || []) {
    const clean = cleanEvent(event);
    if (clean) log.push(clean);
    else if (event) quarantine.push(event);
  }
  log.sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));
  const seen = new Set();
  const unique = [];
  for (const event of log) {
    const key = `${event.t}|${event.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(event);
  }
  return unique;
}

export function sanitizeProgress(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, reason: "El archivo no tiene un objeto de progreso." };
  }
  const looksProgramate = data.app === "programate" || (Array.isArray(data.log) && data.settings);
  const looksChuleta = Array.isArray(data.log) && data.log.some((event) => event && event.id && event.r);
  if (!looksProgramate && !looksChuleta) {
    return { ok: false, reason: "No reconozco este archivo como progreso de Programate ni de Mi Chuleta." };
  }
  const quarantine = [];
  const progress = emptyProgress(Number.isFinite(data.created) ? data.created : Date.now());
  progress.updated = Date.now();
  progress.log = takeLog(data.log, quarantine);
  progress.sims = (Array.isArray(data.sims) ? data.sims : []).map(cleanSim).filter(Boolean).slice(-100);
  progress.settings = cleanSettings(data.settings);
  if (Number.isFinite(data.xp) && data.xp >= 0 && data.xp < 1_000_000) progress.xp = Math.floor(data.xp);
  if (data.xpByDay && typeof data.xpByDay === "object") {
    for (const [day, value] of Object.entries(data.xpByDay)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(value) && value >= 0) {
        progress.xpByDay[day] = Math.floor(value);
      }
    }
  }
  if (data.streak && Number.isFinite(data.streak.count)) {
    progress.streak = {
      count: Math.max(0, Math.floor(data.streak.count)),
      lastDay: typeof data.streak.lastDay === "string" ? data.streak.lastDay : "",
    };
  }
  if (Array.isArray(data.achievements)) {
    progress.achievements = data.achievements.filter((id) => typeof id === "string").slice(0, 40);
  }
  if (Array.isArray(data.quarantine)) quarantine.push(...data.quarantine);
  progress.quarantine = quarantine;
  if (Array.isArray(data.overflow)) progress.overflow = data.overflow.filter((event) => event && event.id);
  if (Array.isArray(data.overflowSims)) progress.overflowSims = data.overflowSims.filter((sim) => sim && sim.t);
  if (data.app === "programate" && data.resume && typeof data.resume === "object" && Array.isArray(data.resume.ids)) {
    progress.resume = data.resume;
  }
  if (progress.log.length > LOG_CAP) {
    const extra = progress.log.length - LOG_CAP;
    progress.overflow = progress.overflow.concat(progress.log.splice(0, extra));
  }
  const warnings = [];
  if (!data.app) warnings.push("El archivo viene de Mi Chuleta. Se han copiado respuestas y simulacros.");
  if (quarantine.length) {
    warnings.push(
      `Se apartaron ${quarantine.length} datos que no pasaron la comprobación. Siguen en «quarantine» y no entran en el cálculo.`,
    );
  }
  if (progress.overflow.length) {
    warnings.push(
      `El cálculo usa las últimas ${LOG_CAP} respuestas. Las anteriores siguen en «overflow» y se exportan con la copia.`,
    );
  }
  return { ok: true, progress, warnings, source: data.app === "programate" ? "programate" : "chuleta" };
}

export function parseImport(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: "El archivo no es JSON válido. No he cambiado tu progreso." };
  }
  return sanitizeProgress(data);
}

export function readStored(raw) {
  if (!raw) return { progress: emptyProgress(), warnings: [], corrupt: null };
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return {
      progress: emptyProgress(),
      warnings: ["El progreso guardado no se pudo leer. Lo he apartado, sin borrarlo, para que puedas descargarlo."],
      corrupt: raw,
    };
  }
  const result = sanitizeProgress(data);
  if (!result.ok) {
    return {
      progress: emptyProgress(),
      warnings: [`${result.reason} He apartado la copia anterior.`],
      corrupt: raw,
    };
  }
  return { progress: result.progress, warnings: result.warnings, corrupt: null };
}

export function serializeProgress(progress) {
  return JSON.stringify({ ...progress, updated: Date.now() }, null, 2);
}
