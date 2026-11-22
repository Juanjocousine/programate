import { levelFromXp, ACHIEVEMENT_LABELS } from "../engine/xp.mjs";
import { isDue, ymd } from "../engine/learning.mjs";
import { bank, itemById, itemsForSubject } from "./bank";
import { esc, formatWhen } from "./format";
import { JAVA_SUBJECT, javaGroups, units } from "./java";
import { model } from "./store";

import { icons } from "./icons";

export function icon(name: string, className = "") {
  return `<i class="glyph ${className}" aria-hidden="true">${icons[name] || ""}</i>`;
}

const subjects = [
  [JAVA_SUBJECT, "Programación", "1.º DAM", "code-xml", "java"],
  ["ad", "AD", "Acceso a Datos", "database", "ice"],
  ["sge", "SGE", "Sistemas Gestores", "server", "mint"],
  ["dig", "Digitalización", "Entorno Digital", "cloud", "violet"],
  ["psp", "PSP", "Servicios y Procesos", "network", "purple"],
  ["di", "DI", "Desarrollo Interfaces", "monitor", "violet"],
];

export function subjectLinks() {
  return subjects.map(([id, name, , glyph, color]) =>
    `<a class="${color}" href="#${id === JAVA_SUBJECT ? "/mi-ruta" : `/ruta/${id}`}">${icon(glyph)}${name}</a>`,
  ).join("");
}

function meter(percent: number) {
  return `<div class="meter"><span style="width:${percent}%"></span></div>`;
}

type AcademySummary = {
  concepts: Record<string, { subjectId: string; level: number }>;
  subconcepts: Record<string, { level: number }>;
};

function statsFor(id: string, summary: AcademySummary) {
  const concepts = Object.values(summary.concepts).filter((concept) => concept.subjectId === id);
  const completed = concepts.filter((concept) => concept.level >= 2).length;
  const total = id === JAVA_SUBJECT ? units.length : concepts.length;
  return { completed, total, pct: total ? Math.round(100 * completed / total) : 0 };
}

function milestones(summary: AcademySummary) {
  const glyphs = ["code-xml", "workflow", "box", "layers", "database"];
  return `<div class="milestones">${javaGroups.map((title, index) => {
    const group = units.filter((unit) => unit.group === index);
    const levels = group.map((unit) => summary.subconcepts[`java-${unit.id}`]?.level || 0);
    const locked = !group.some((unit) => unit.lesson);
    const percent = Math.round(100 * levels.filter((level) => level >= 2).length / group.length);
    const status = locked ? "Pendiente de contenido" : levels.every((level) => level === 3) ? "Dominada" : percent === 100 ? "Completada" : levels.some(Boolean) ? "En progreso" : "Disponible";
    return `<a class="milestone ${index === 0 ? "primary" : ""}" href="#/mi-ruta/${index}" aria-label="${title}, ${status}, ${percent}%">
      <span class="node-number">${index + 1}</span>${icon(glyphs[index], "node-icon")}
      <strong>${title}</strong><span class="node-status">${status}</span>
      <div class="meter-row">${meter(percent)}<span>${percent}%</span>${locked ? icon("lock-keyhole") : ""}</div>
    </a>`;
  }).join("")}</div>`;
}

export function academyHome() {
  const { progress, states, summary: derived } = model();
  const summary = derived as AcademySummary;
  const log = progress.log as { id: string; r: string; rt?: number; t: number }[];
  const xpByDay: Record<string, number> = progress.xpByDay;
  const java = statsFor(JAVA_SUBJECT, summary);
  const next = units.find((unit) => unit.lesson && (summary.subconcepts[`java-${unit.id}`]?.level || 0) < 2);
  const resume = progress.resume as { stage: string; index: number; ids: string[] } | null;
  const resuming = resume && resume.stage !== "done";
  const today = xpByDay[ymd(Date.now())] || 0;
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - i);
    return ymd(day);
  });
  const weekXp = week.reduce((total, day) => total + (xpByDay[day] || 0), 0);
  const due = bank.items.filter((item) => isDue(states[item.id], Date.now())).length;
  const correct = new Set(log.filter((entry) => entry.r === "o" && !entry.rt).map((entry) => entry.id)).size;
  const recent = log.slice(-3).reverse();
  const examsPct = Math.round(subjects.slice(1).reduce((sum, [id]) => sum + statsFor(id, summary).pct, 0) / 5);

  return `<section class="hero academy-hero">
    <h1>Tu academia de <em>programación</em></h1>
    <p>Aprende, practica, entiende y aprueba.</p>
    <div class="hero-links">
      <a href="#/mi-ruta">${icon("cpu")} Programación</a>
      <a href="#/rutas">${icon("scan-line")} DAM</a>
      <a href="#/practicar">${icon("route")} Ejercicios</a>
      <span title="Tutor con IA pendiente">${icon("bot")} Tutor IA · Próximamente</span>
    </div>
  </section>
  <div class="dashboard">
    <div class="dashboard-main">
      <section class="path-panel">
        <div class="section-head"><h2>${icon("workflow")} Mi ruta de aprendizaje</h2><a href="#/mi-ruta">Ver ruta completa ${icon("arrow-right")}</a></div>
        ${milestones(summary)}
      </section>
      <div class="dashboard-split">
        <article class="dash-card continue-card">
          <div class="continue-art" aria-hidden="true">${icon("play")}</div>
          <div><h2>Continúa donde lo dejaste</h2>
            <strong>${resuming ? "Sesión en curso" : esc(next?.title || "Repaso del itinerario Java")}</strong>
            <p>${resuming ? `Pregunta ${resume.index + 1} de ${resume.ids.length}` : "Programación · 1.º DAM"}</p>
            <a class="btn" href="#${resuming ? "/sesion" : next ? `/lecciones/${next.id}` : "/repaso"}">${icon("play")} ${resuming ? "Continuar sesión" : next ? "Continuar lección" : "Repasar"}</a>
          </div>
        </article>
        <article class="dash-card progress-card">
          <div class="section-head"><h2>${icon("chart-no-axes-column-increasing")} Tu progreso general</h2></div>
          <div class="progress-content">
            <a class="donut" href="#/progreso" aria-label="Ver progreso, ${java.pct}% del itinerario" style="--progress:${java.pct}%"><strong>${java.pct}%</strong></a>
            <dl><div><dt>Unidades Java completadas</dt><dd>${java.completed} / ${java.total}</dd></div><div><dt>Ejercicios resueltos</dt><dd>${correct}</dd></div><div><dt>XP total</dt><dd>${progress.xp.toLocaleString("es-ES")}</dd></div></dl>
          </div>
        </article>
      </div>
      <section class="subjects-panel">
        <div class="section-head"><h2>${icon("panels-top-left")} Mis asignaturas</h2><a href="#/rutas">Ver todas ${icon("arrow-right")}</a></div>
        <div class="subject-grid">${subjects.map(([id, name, sub, glyph, color]) => {
          const { pct } = statsFor(id, summary);
          return `<a class="subject-card ${color}" href="#${id === JAVA_SUBJECT ? "/mi-ruta" : `/ruta/${id}`}">${icon(glyph)}<strong>${name}</strong><small>${sub}</small><div class="meter-row">${meter(pct)}<span>${pct}%</span></div></a>`;
        }).join("")}</div>
      </section>
      <div class="dashboard-split study-summary">
        <article class="dash-card"><h2>${icon("flame")} Objetivo diario</h2><p>${today} / ${progress.settings.dailyGoal} XP hoy · ${weekXp} XP en los últimos 7 días</p>${meter(Math.min(100, today * 100 / progress.settings.dailyGoal))}<a href="#/progreso">Ver actividad semanal</a></article>
        <article class="dash-card"><h2>${icon("repeat-2")} Repaso y práctica rápida</h2><p>${due} ejercicios pendientes de repaso</p><div class="row"><a href="#/repaso">Abrir repaso</a><a href="#/practicar">Elegir ejercicios</a></div></article>
      </div>
    </div>
    <aside class="dashboard-side">
      <section class="exam-panel">
        <div class="section-head"><h2>${icon("calendar-days")} Mi plan de exámenes</h2></div>
        <div class="dash-card exam-card">
          <div class="exam-row">${icon("goal")}<div><strong>Programación (1.º DAM)</strong><span class="date-pill">Enero 2027</span><div class="meter-row">${meter(java.pct)}<span>${java.pct}%</span></div></div></div>
          <div class="exam-row">${icon("calendar-range")}<div><strong>5 asignaturas</strong><span class="date-pill">Febrero 2027</span><div class="meter-row">${meter(examsPct)}<span>${examsPct}%</span></div></div></div>
          <a class="btn ghost" href="#/examenes">${icon("calendar-check")} Ver plan de estudio</a>
        </div>
      </section>
      <section class="dash-card recent-card">
        <h2>${icon("activity")} Actividad reciente</h2>
        ${recent.length ? recent.map((row) => {
          const item = itemById(row.id);
          return `<div class="activity-row">${icon(row.r === "o" ? "check" : "rotate-ccw")}<div><strong>${row.r === "o" ? "Ejercicio resuelto" : "Ejercicio para repasar"}</strong><small>${esc(item?.stem || row.id)}</small><small>${esc(formatWhen(row.t))}</small></div></div>`;
        }).join("") : `<p>Aún no hay respuestas registradas.</p><a href="#/lecciones">Empieza tu primera lección ${icon("arrow-right")}</a>`}
      </section>
      <section class="dash-card lab-card">
        <h2>${icon("square-terminal")} Laboratorio de código</h2>
        <p>Lee y analiza código Java con ejercicios guiados.</p>
        <a class="btn" href="#/laboratorio">Ir al laboratorio ${icon("arrow-right")}</a>
      </section>
    </aside>
  </div>`;
}

export function routeJava(groupId?: string) {
  const summary = model().summary as AcademySummary;
  const shown = groupId !== undefined && /^\d$/.test(groupId) && javaGroups[Number(groupId)] ? [Number(groupId)] : javaGroups.map((_, i) => i);
  return `<section class="screen-title"><p class="kicker">Programación · 1.º DAM</p><h1>Mi ruta de aprendizaje</h1><p class="lead">Itinerario piloto de Java. El temario oficial está pendiente de incorporar.</p></section>
    ${milestones(summary)}
    <div class="stack route-units">${shown.map((group) => `<section class="card"><h2>${javaGroups[group]}</h2><ul class="plain">${units.filter((unit) => unit.group === group).map((unit) => {
      const level = summary.subconcepts[`java-${unit.id}`]?.level || 0;
      const label = unit.lesson ? ["Disponible", "En progreso", "Completada", "Dominada"][level] : "Bloqueada · contenido pendiente";
      return `<li>${unit.lesson ? `<a href="#/lecciones/${unit.id}">${esc(unit.title)}</a>` : esc(unit.title)} <span class="pill">${label}</span></li>`;
    }).join("")}</ul></section>`).join("")}</div>`;
}

export function lessons(id?: string) {
  const unit = units.find((row) => row.id === id);
  if (!unit?.lesson) return `<section class="screen-title"><h1>Lecciones de Java</h1><p class="lead">Contenido original provisional para preparar Programación de 1.º DAM.</p></section><div class="stack">${units.filter((row) => row.lesson).map((row) => `<a class="card link" href="#/lecciones/${row.id}">${icon("book-open")} ${esc(row.title)} ${icon("arrow-right")}</a>`).join("")}</div>`;
  return `<section class="screen-title"><p class="kicker">Java · Piloto provisional</p><h1>${esc(unit.title)}</h1></section>
    <article class="card lesson-card"><h2>El concepto</h2><p>${esc(unit.lesson.text)}</p><h2>Ejemplo en Java</h2><pre class="code"><code>${esc(unit.lesson.code)}</code></pre><h2>Qué recordar</h2><p>${esc(unit.lesson.summary)}</p><div class="row"><button type="button" class="btn" data-act="learn-concept" data-id="java-${unit.id}">${icon("play")} Practicar esta lección</button><a href="#/mi-ruta/${unit.group}">Ver unidades</a></div></article>`;
}

export function lab() {
  return `<section class="screen-title"><h1>Laboratorio de código</h1><p class="lead">Predice resultados y analiza errores en fragmentos Java.</p></section>
    <div class="grid"><article class="card"><h2>${icon("square-terminal")} Análisis de código</h2><p>Practica trazas de bucles, condiciones y errores de compilación con corrección y pistas.</p><button class="btn" type="button" data-act="start-lab">Abrir ejercicios guiados</button></article><article class="card"><h2>Borrador Java</h2><label for="java-draft">Escribe y edita tu código</label><textarea id="java-draft" spellcheck="false" rows="8">${esc(localStorage.getItem("programate.java-draft") ?? "// Escribe aquí tus notas de Java.")}</textarea><p class="muted">El borrador se guarda en este navegador. Ejecución y depuración pendientes de un entorno aislado.</p></article></div>`;
}

export function exams() {
  return `<section class="screen-title"><h1>Mi plan de exámenes</h1><p class="lead">Preparación personal · DAM 2027</p></section>
    <div class="grid"><article class="card"><p class="kicker">Enero 2027</p><h2>Programación de 1.º DAM</h2><p>Estudia el piloto de Java. Fecha exacta y temario oficial pendientes.</p><div class="row"><a class="btn" href="#/mi-ruta">Ver itinerario</a><a href="#/simulacro/java">Practicar simulacro Java</a></div></article>
    <article class="card"><p class="kicker">Febrero 2027</p><h2>Cinco asignaturas de DAM</h2><p>Acceso a Datos, Diseño de Interfaces, SGE, PSP y Digitalización.</p><div class="row"><a class="btn" href="#/rutas">Elegir asignatura</a><a href="#/simulacro">Simulacro de Acceso a Datos</a></div></article></div>`;
}

export function achievements() {
  const { progress } = model();
  return `<section class="screen-title"><h1>Logros</h1><p class="lead">Nivel ${levelFromXp(progress.xp)} · ${progress.xp} XP</p></section><div class="stack">${Object.entries(ACHIEVEMENT_LABELS).map(([id, label]) => {
    const unlocked = (progress.achievements as string[]).includes(id);
    return `<article class="card row">${icon(unlocked ? "trophy" : "lock-keyhole")} <strong>${label}</strong><span class="pill">${unlocked ? "Conseguido" : "Por desbloquear"}</span></article>`;
  }).join("")}</div>`;
}
