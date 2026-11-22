import { academyHome, achievements, exams, icon, lab, lessons, routeJava, subjectLinks } from "./academy";
import { JAVA_SUBJECT, units } from "./java";
import catalog from "../config/plans.study.json";
import { ACHIEVEMENT_LABELS, levelFromXp } from "../engine/xp.mjs";
import { examPreparation, recurringConfusions, scoreLabel, weakSubconcepts } from "../engine/learning21.mjs";
import { isDue, ymd } from "../engine/learning.mjs";
import { bank, conceptById, itemById, itemsForConcept, itemsForSubject, subconceptById, subjectName } from "./bank";
import { esc, formatGrade, formatWhen, rich } from "./format";
import { consumeFlash, getCorrupt, getNotices, getPending, getProgress, legacyAvailable, model } from "./store";

const LEVELS = ["Sin ver", "Aprendiendo", "Aceptable", "Dominado"];
const FUTURE = [
  ["daw", "DAW", "Desarrollo de aplicaciones web"],
  ["smr", "SMR", "Sistemas microinformáticos y redes"],
  ["asir", "ASIR", "Administración de sistemas"],
  ["ia", "IA y Big Data", "Ciclo que todavía no tiene banco"],
  ["web", "Desarrollo web", "De cero a una aplicación web"],
  ["python", "Python", "Sin preguntas en el banco"],
  ["javascript", "JavaScript y TypeScript", "Sin preguntas en el banco"],
  ["git", "Git y herramientas", "Sin preguntas en el banco"],
  ["proyectos", "Proyectos prácticos", "Cuando exista práctica profesional en el banco"],
];

const plans = catalog as {
  note: string;
  features: { id: string; description: string; kind: string }[];
  plans: { id: string; name: string; prices: { amountCents: number; priceStatus: string }[]; grants: Record<string, { enabled: boolean; limit?: number }> }[];
};

function shell(current: string, body: string) {
  const links = [
    ["/", "Inicio", "house"], ["/mi-ruta", "Mi ruta", "layers"],
    ["/lecciones", "Lecciones", "book-open"], ["/practicar", "Ejercicios", "code-xml"],
    ["/laboratorio", "Laboratorio", "flask-conical"], ["/simulacro", "Simulacros", "target"],
    ["/examenes", "Exámenes", "calendar-days"], ["/progreso", "Progreso", "chart-no-axes-column-increasing"],
    ["/logros", "Logros", "trophy"], ["/planes", "Planes", "credit-card"],
  ];
  const progress = getProgress();
  const flash = consumeFlash();
  const today = ymd(Date.now());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const streak = [today, ymd(yesterday)].includes(progress.streak.lastDay) ? progress.streak.count : 0;
  return `<a class="skip" href="#contenido" data-skip>Saltar al contenido</a>
    <aside class="sidebar">
      <a class="brand" href="#/">${icon("code-xml")}<span>Programate<small>Aprende · Practica · Aprueba</small></span></a>
      <nav class="nav" aria-label="Secciones">${links.map(([href, label, glyph]) => `<a href="#${href}" ${current === href ? 'aria-current="page"' : ""}>${icon(glyph)}${label}</a>`).join("")}</nav>
      <nav class="side-subjects" aria-label="Asignaturas"><p>Mis asignaturas</p>${subjectLinks()}</nav>
      <a class="side-settings" href="#/ajustes">${icon("settings")} Configuración</a>
    </aside>
    <header class="top">
      <a class="brand mobile-brand" href="#/">${icon("code-xml")} Programate</a>
      <div class="global-search">${icon("search")}<input id="search" type="search" aria-label="Buscar temas, ejercicios o conceptos" placeholder="Buscar temas, ejercicios o conceptos…"><div id="search-out" aria-live="polite"></div></div>
      <div class="top-stats">
        <a href="#/progreso"><span class="flame" aria-hidden="true">🔥</span><span>Racha<strong>${streak} ${streak === 1 ? "día" : "días"}</strong></span></a>
        <a href="#/progreso">${icon("boxes", "xp-icon")}<span>XP<strong>${progress.xp.toLocaleString("es-ES")}</strong></span></a>
        <a href="#/logros">${icon("shield", "level-icon")}<span>Nivel<strong>${levelFromXp(progress.xp)}</strong></span></a>
      </div>
      <div class="top-actions"><a href="#/repaso" aria-label="Repasos">${icon("bell")}</a><a class="profile" href="#/ajustes" aria-label="Configuración de estudio">${icon("user-round")}</a></div>
    </header>
    <main id="contenido" tabindex="-1" class="${current === "/" ? "home-page" : "inner-page"}">${notices()}${flash ? `<div class="banner" role="status"><p>${esc(flash)}</p></div>` : ""}${body}</main>`;
}

function settings() {
  const settings = getProgress().settings;
  const themeLabel = settings.theme === "dark" ? "Oscuro" : settings.theme === "light" ? "Claro" : "Academia";
  return `<section class="screen-title"><h1>Configuración</h1><p class="lead">Preferencias de estudio de este dispositivo.</p></section><section class="card stack-form"><label for="goal">Objetivo diario en XP</label><input id="goal" type="number" min="10" max="200" value="${settings.dailyGoal}"><div class="row"><button class="btn" type="button" data-act="save-goal">Guardar objetivo</button><button class="btn ghost" type="button" data-act="theme">Tema: ${themeLabel}</button><a href="#/progreso">Gestionar copia de progreso</a></div></section>`;
}

function notices() {
  const rows = getNotices().map(
    (notice) =>
      `<div class="banner" role="status"><p>${esc(notice.text)}</p><button type="button" class="btn ghost" data-act="dismiss" data-id="${esc(notice.id)}">Entendido</button></div>`,
  );
  if (legacyAvailable()) {
    rows.push(
      `<div class="banner"><p>En este navegador está el progreso de Mi Chuleta. Puedes traerlo. No se copia solo.</p><button type="button" class="btn" data-act="preview-legacy">Revisar e importar</button><button type="button" class="btn ghost" data-act="dismiss" data-id="legacy">Ahora no</button></div>`,
    );
  }
  const corrupt = getCorrupt();
  if (corrupt) {
    rows.push(
      `<div class="banner warn"><p>Había un progreso que no se pudo leer. Sigue guardado para descargarlo y no lo he usado.</p><button type="button" class="btn" data-act="download-corrupt">Descargar copia dañada</button></div>`,
    );
  }
  const pending = getPending();
  if (pending) {
    rows.push(
      `<div class="banner warn" role="alertdialog" aria-labelledby="import-title"><h2 id="import-title">¿Reemplazar el progreso de este dispositivo?</h2><p>La copia trae ${pending.progress.log.length} respuestas y ${pending.progress.sims.length} simulacros. El progreso actual se sustituye. Exporta antes si quieres guardarlo.</p>${pending.warnings.map((warning) => `<p>${esc(warning)}</p>`).join("")}<div class="row"><button type="button" class="btn" data-act="confirm-import">Reemplazar</button><button type="button" class="btn ghost" data-act="cancel-import">Cancelar</button><button type="button" class="btn ghost" data-act="export">Exportar lo que hay ahora</button></div></div>`,
    );
  }
  return rows.join("");
}

function levelPill(level: number) {
  return `<span class="pill lv-${level}">${LEVELS[level] || LEVELS[0]}</span>`;
}

function dueItems(states: Record<string, any>) {
  const now = Date.now();
  return bank.items.filter((item) => isDue(states[item.id], now));
}

export function render(path: string) {
  const parts = path.split("/").filter(Boolean);
  const root = parts[0] || "";
  const current = root === "sesion" ? "/practicar" : `/${root}`;
  let body = "";
  if (!root) body = academyHome();
  else if (root === "mi-ruta") body = routeJava(parts[1]);
  else if (root === "lecciones") body = lessons(parts[1]);
  else if (root === "laboratorio") body = lab();
  else if (root === "examenes") body = exams();
  else if (root === "logros") body = achievements();
  else if (root === "ajustes") body = settings();
  else if (root === "rutas") body = routes();
  else if (root === "ruta") body = routePage(parts[1] || "");
  else if (root === "concepto") body = conceptPage(parts[1] || "");
  else if (root === "glosario") body = glossaryPage(parts[1] || "");
  else if (root === "practicar") body = practice();
  else if (root === "simulacro") body = simSetup(parts[1] === "java" ? JAVA_SUBJECT : "ad");
  else if (root === "repaso") body = review();
  else if (root === "progreso") body = progressPage();
  else if (root === "planes") body = plansPage();
  else if (root === "sesion") body = sessionPage();
  else body = `<section class="card"><h1>Esa pantalla no existe</h1><p><a href="#/">Volver al inicio</a></p></section>`;
  return shell(current, body);
}

export function searchHtml(query: string) {
  const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const text = normalize(query.trim());
  if (text.length < 2) return "";
  const concepts = bank.concepts.filter((concept) => concept.subjectId !== JAVA_SUBJECT && normalize(concept.title).includes(text)).slice(0, 6);
  const terms = bank.terms.filter((term) => normalize(term.title).includes(text)).slice(0, 6);
  const items = bank.items.filter((item) => normalize(item.stem).includes(text)).slice(0, 6);
  const lessons = units.filter((unit) => unit.lesson && normalize(unit.title).includes(text));
  if (!lessons.length && !concepts.length && !terms.length && !items.length) return `<p class="muted">Nada en el banco con ese texto.</p>`;
  return `<ul class="results">${lessons.map((unit) => `<li><a href="#/lecciones/${unit.id}">${esc(unit.title)}</a><span>Lección</span></li>`).join("")}${concepts
    .map((concept) => `<li><a href="#/concepto/${esc(concept.id)}">${esc(concept.title)}</a><span>Concepto</span></li>`)
    .join("")}${terms
    .map((term) => `<li><a href="#/glosario/${esc(term.subjectId)}">${esc(term.title)}</a><span>Diccionario</span></li>`)
    .join("")}${items
    .map((item) => `<li><a href="${item.subjectId === JAVA_SUBJECT ? `#/lecciones/${esc(item.conceptId.slice(5))}` : `#/concepto/${esc(item.conceptId)}`}">${esc(item.stem.slice(0, 140))}</a><span>${esc(item.id)}</span></li>`)
    .join("")}</ul>`;
}

function routes() {
  const ready = bank.subjects.filter((subject) => subject.id !== JAVA_SUBJECT && itemsForSubject(subject.id).length);
  const java = bank.concepts.filter((concept) => concept.routes.includes("pro.java"));
  return `<section><h1>Asignaturas y rutas</h1><p class="lead">Piloto de Programación y banco de práctica DAM 2.1.</p></section><a href="#/mi-ruta" class="card link">Programación de 1.º DAM · Piloto de Java ${icon("arrow-right")}</a>
  <div class="stack">
    ${ready
      .map((subject) => {
        const count = itemsForSubject(subject.id).length;
        return `<a class="card link" href="#/ruta/${esc(subject.id)}"><div><p class="kicker">${esc(subject.short)}</p><h2>${esc(subject.name)}</h2><p>${esc(subject.description || "Preguntas del banco, sin apuntes HTML.")}</p></div><b>${count}</b></a>`;
      })
      .join("")}
    <a class="card link" href="#/ruta/java"><div><p class="kicker">Profesional</p><h2>Fundamentos de Java</h2><p>El Java que de verdad está en Acceso a Datos: colecciones, comparación, streams, ficheros, JSON, JDBC e Hibernate. No es un curso desde cero.</p></div><b>${java.length} conceptos</b></a>
    ${bank.glossaries
      .map(
        (glossary) =>
          `<a class="card link" href="#/glosario/${esc(glossary.id)}"><div><p class="kicker">Solo diccionario</p><h2>${esc(glossary.name)}</h2><p>${esc(glossary.note || "Hay términos y no hay preguntas.")}</p></div><span>Glosario</span></a>`,
      )
      .join("")}
    ${FUTURE.map(
      ([id, name, detail]) =>
        `<article class="card soon"><div><p class="kicker">Próximamente</p><h2>${esc(name)}</h2><p>${esc(detail)}</p></div></article>`,
    ).join("")}
  </div>`;
}

function routePage(id: string) {
  if (id === "java") {
    const concepts = bank.concepts.filter((concept) => concept.routes.includes("pro.java"));
    const { summary } = model();
    return `<section><p class="kicker"><a href="#/rutas">Rutas</a></p><h1>Fundamentos de Java</h1><p class="lead">Estos conceptos pertenecen a Acceso a Datos. La ruta los reúne; no duplica las preguntas.</p></section>
    ${conceptList(concepts, summary)}
    <section class="card"><h2>Diccionario de programación</h2><p>Doce términos de 1.º, sin preguntas.</p><a class="btn ghost" href="#/glosario/prg">Abrir glosario</a></section>`;
  }
  const subject = bank.subjects.find((row) => row.id === id);
  if (!subject) return `<section class="card"><h1>Ruta no disponible</h1><p><a href="#/rutas">Volver a rutas</a></p></section>`;
  const concepts = bank.concepts.filter((concept) => concept.subjectId === id);
  const { summary } = model();
  const count = itemsForSubject(id).length;
  return `<section><p class="kicker"><a href="#/rutas">Rutas</a></p><h1>${esc(subject.name)}</h1><p class="lead">${esc(subject.description)} ${count} preguntas en el banco.</p>
    <a class="btn" href="#/practicar">Practicar</a></section>
    ${conceptList(concepts, summary)}`;
}

function conceptList(concepts: typeof bank.concepts, summary: any) {
  if (!concepts.length) return `<section class="card"><p>No hay conceptos con preguntas en esta ruta.</p></section>`;
  return `<div class="stack">${concepts
    .map((concept) => {
      const standing = summary.concepts[concept.id];
      const count = itemsForConcept(concept.id).length;
      return `<a class="card link" href="#/concepto/${esc(concept.id)}"><div><h2>${esc(concept.title)}</h2><p class="muted">${esc(concept.topic || "")}</p></div><div class="end">${levelPill(standing?.level || 0)}<span>${count}</span></div></a>`;
    })
    .join("")}</div>`;
}

function conceptPage(id: string) {
  const concept = conceptById(id);
  if (!concept) return `<section class="card"><h1>Concepto no encontrado</h1><p>Ese identificador no está en el banco.</p></section>`;
  const { summary } = model();
  const subs = bank.subconcepts.filter((sub) => sub.conceptId === id);
  const cards = bank.knowledge.filter((card) => subs.some((sub) => sub.id === card.subconceptId) || card.subconceptId === id);
  const rules = bank.rules.filter((rule) => rule.ref === id || subs.some((sub) => sub.id === rule.ref));
  const terms = bank.terms.filter((term) => concept.terms.some((title) => title.toLowerCase() === term.title.toLowerCase()));
  const traces = bank.traces.filter((trace) => cards.some((card) => card.traceId === trace.id) || subs.some((sub) => sub.id === trace.sc));
  return `<section><p class="kicker"><a href="#/ruta/${esc(concept.subjectId)}">${esc(subjectName(concept.subjectId))}</a></p><h1>${esc(concept.title)}</h1>
    ${concept.confusion ? `<p class="lead">${rich(concept.confusion)}</p>` : ""}
    <button type="button" class="btn" data-act="learn-concept" data-id="${esc(concept.id)}">Practicar este concepto</button>
    ${levelPill(summary.concepts[id]?.level || 0)}
  </section>
  ${cards
    .map((card) => {
      const title = subconceptById(card.subconceptId)?.title || concept.title;
      return `<article class="card"><h2>${esc(title)}</h2>${card.easy ? `<p>${rich(card.easy)}</p>` : `<p class="muted">No hay explicación fácil para este apartado.</p>`}${card.example ? `<pre class="code">${esc(card.example)}</pre>` : ""}${table(card.compare)}</article>`;
    })
    .join("")}
  ${
    terms.length
      ? `<section class="card"><h2>Diccionario</h2>${terms
          .map(
            (term) =>
              `<h3>${esc(term.title)}</h3><p>${rich(term.definition)}</p>${term.analogy ? `<p class="muted">${rich(term.analogy)}</p>` : ""}`,
          )
          .join("")}</section>`
      : ""
  }
  ${rules.length ? `<section class="card"><h2>Reglas del banco</h2><ul>${rules.map((rule) => `<li>${rich(rule.text)}</li>`).join("")}</ul></section>` : ""}
  ${traces.map(traceHtml).join("")}
  <section class="card"><h2>${itemsForConcept(id).length} preguntas</h2><p class="muted">Se responden en la práctica, con corrección. Aquí no se adelanta la solución.</p></section>`;
}

function table(rows: string[][] | null) {
  if (!rows || !rows.length) return "";
  const head = rows[0].map((cell) => `<th>${rich(cell)}</th>`).join("");
  const body = rows
    .slice(1)
    .map((row) => `<tr>${row.map((cell) => `<td>${rich(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function traceHtml(trace: (typeof bank.traces)[number]) {
  const lines = (trace.lines || []).map((line, index) => `${index + 1}  ${line}`).join("\n");
  const steps = (trace.steps || [])
    .map((step) => {
      const vars =
        step.v && typeof step.v === "object"
          ? Object.entries(step.v)
              .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
              .map(([key, value]) => `${key}=${value}`)
              .join(", ")
          : "";
      return `<li><b>Línea ${esc(step.l ?? "")}</b> ${rich(step.s || "")}${vars ? `<span class="muted"> ${esc(vars)}</span>` : ""}</li>`;
    })
    .join("");
  return `<section class="card"><h2>${esc(trace.t || "Seguimiento del código")}</h2>${lines ? `<pre class="code">${esc(lines)}</pre>` : ""}${steps ? `<ol>${steps}</ol>` : `<p class="muted">Este seguimiento no trae pasos legibles.</p>`}</section>`;
}

function glossaryPage(id: string) {
  const glossary = bank.glossaries.find((row) => row.id === id);
  const terms = bank.terms.filter((term) => term.subjectId === id);
  if (!terms.length) return `<section class="card"><h1>Sin términos</h1><p>No hay diccionario para esa clave.</p></section>`;
  return `<section><p class="kicker"><a href="#/rutas">Rutas</a></p><h1>${esc(glossary?.name || subjectName(id))}</h1><p class="lead">${esc(glossary?.note || "Términos del banco. No hay una ruta de preguntas asociada.")}</p></section>
  <div class="stack">${terms
    .map(
      (term) =>
        `<article class="card"><h2>${esc(term.title)}</h2><p>${rich(term.definition)}</p>${term.analogy ? `<p>${rich(term.analogy)}</p>` : ""}${term.snippet ? `<pre class="code">${esc(term.snippet)}</pre>` : ""}${term.examHint ? `<p class="muted">${rich(term.examHint)}</p>` : ""}</article>`,
    )
    .join("")}</div>`;
}

function practice() {
  const subjects = bank.subjects.filter((subject) => itemsForSubject(subject.id).length).reverse();
  return `<section><h1>Ejercicios</h1><p class="lead">La práctica puntúa 1 o 0, sin la penalización del examen. Al final puedes repasar solo los fallos.</p></section>
  <form class="card stack-form" id="practice-form">
    <label for="practice-subject">Asignatura</label>
    <select id="practice-subject">${subjects.map((subject) => `<option value="${esc(subject.id)}">${esc(subject.name)}</option>`).join("")}</select>
    <label for="practice-concept">Concepto</label>
    <select id="practice-concept"><option value="">Todos los de la asignatura</option>${bank.concepts
      .map((concept) => {
        const hidden = concept.subjectId === subjects[0]?.id ? "" : "hidden";
        return `<option value="${esc(concept.id)}" data-subject="${esc(concept.subjectId)}" ${hidden}>${esc(concept.title)}</option>`;
      })
      .join("")}</select>
    <label for="practice-count">Preguntas</label>
    <select id="practice-count"><option>5</option><option selected>10</option><option>20</option></select>
    <button class="btn" type="button" data-act="start-practice">Empezar test</button>
  </form>`;
}

function simSetup(subjectId: string) {
  const scoring = getProgress().settings.scoring;
  const label = scoreLabel("ad", scoring, true);
  const subjects = bank.subjects.filter((subject) => itemsForSubject(subject.id).some((item) => item.kind === "multiple-choice"));
  return `<section class="screen-title"><h1>Simulacros</h1><p class="lead">Prepara el examen con preguntas del banco DAM y del piloto Java.</p><div class="row"><a href="#/practicar">Modo práctica</a><a href="#/examenes">Plan de exámenes</a></div></section>
  <form class="card stack-form">
    <label for="sim-subject">Asignatura</label>
    <select id="sim-subject">${subjects.map((subject) => `<option value="${esc(subject.id)}" ${subject.id === subjectId ? "selected" : ""}>${esc(subject.name)}</option>`).join("")}</select>
    <label for="sim-concept">Tema</label><select id="sim-concept"><option value="">Todos los temas</option>${bank.concepts.filter((concept) => subjects.some((subject) => subject.id === concept.subjectId)).map((concept) => `<option value="${esc(concept.id)}" data-subject="${esc(concept.subjectId)}" ${concept.subjectId === subjectId ? "" : "hidden"}>${esc(concept.title)}</option>`).join("")}</select>
    <label for="sim-time">Temporizador</label><select id="sim-time"><option value="0">Sin límite</option><option value="5">5 minutos</option><option value="15">15 minutos</option><option value="30">30 minutos</option></select>
    <label for="sim-count">Preguntas de opción</label>
    <select id="sim-count"><option>10</option><option selected>20</option><option>30</option></select>
    <details class="sim-ad" ${subjectId === "ad" ? "open" : "hidden"}><summary>Reglas de puntuación de Acceso a Datos</summary><p class="muted">${esc(label.text)}</p><label for="sim-pen">Penalización de las preguntas únicas</label>
    <select id="sim-pen"><option value="1" ${scoring.pen ? "selected" : ""}>Sí, −0,33 (regla confirmada)</option><option value="0" ${scoring.pen ? "" : "selected"}>No, modo práctica</option></select>
    <label for="sim-multi">Preguntas con varias respuestas</label>
    <select id="sim-multi">
      <option value="prop" ${scoring.multi === "prop" ? "selected" : ""}>Reparto proporcional (interpretación)</option>
      <option value="minus1" ${scoring.multi === "minus1" ? "selected" : ""}>Exacta +1, cualquier fallo −1 (interpretación)</option>
      <option value="none" ${scoring.multi === "none" ? "selected" : ""}>Sin penalización</option>
    </select>
    <p class="muted">No hay un número oficial de preguntas ni una fórmula múltiple escrita. La nota es una orientación con la regla que elijas, no un examen oficial.</p>
    </details><p class="muted">Para las demás asignaturas cada acierto suma un punto. Los resultados son orientativos.</p>
    <button class="btn" type="button" data-act="start-sim">Empezar simulacro</button>
  </form>
  ${subjects.map((subject) => `<div data-sim-history="${esc(subject.id)}" ${subject.id === subjectId ? "" : "hidden"}>${simHistory(subject.id)}</div>`).join("")}`;
}

function simHistory(subjectId: string) {
  const sims = getProgress().sims.filter((sim: any) => sim.subjectId === subjectId && sim.kind !== "err");
  if (!sims.length) return `<section class="card"><h2>Historial</h2><p class="muted">Cuando entregues un simulacro, la nota se queda aquí.</p></section>`;
  const last = sims[sims.length - 1];
  const prev = sims.length > 1 ? sims[sims.length - 2] : null;
  return `<section class="card"><h2>Historial · ${esc(subjectName(subjectId))}</h2>
    <p>Última nota: <b>${formatGrade(last.grade)}</b>${prev ? `. La anterior fue ${formatGrade(prev.grade)} (${last.grade - prev.grade >= 0 ? "+" : ""}${formatGrade(last.grade - prev.grade)}).` : ". Hace falta otro simulacro para ver una evolución."}</p>
    <ul class="plain">${sims
      .slice(-8)
      .reverse()
      .map((sim: any) => `<li>${esc(formatWhen(sim.t))} · ${formatGrade(sim.grade)} · ${sim.ok} aciertos, ${sim.ko} fallos, ${sim.bl} en blanco</li>`)
      .join("")}</ul></section>`;
}

function review() {
  const { states, summary } = model();
  const now = Date.now();
  const due = dueItems(states);
  const weak = weakSubconcepts(summary).slice(0, 8);
  const flags = recurringConfusions(getProgress().log, bank.items, bank.confusions, now);
  const upcoming = bank.items
    .filter((item) => {
      const state = states[item.id];
      return state && state.n && !state.pend && state.due > now;
    })
    .sort((a, b) => states[a.id].due - states[b.id].due)
    .slice(0, 8);
  return `<section><h1>Repaso</h1><p class="lead">La cola solo incluye preguntas que ya respondiste y cuyo plazo ha llegado. Un acierto el mismo día del fallo no las saca de pendientes.</p>
    ${due.length ? `<button type="button" class="btn" data-act="start-due">Repasar ${due.length}</button>` : ""}
  </section>
  <section class="card"><h2>Para hoy</h2>${due.length ? `<ul class="plain">${due.slice(0, 12).map((item) => `<li>${esc(subconceptById(item.subconceptId)?.title || "")} · ${rich(item.stem.slice(0, 110))}</li>`).join("")}</ul>` : `<p class="muted">No tienes repasos vencidos.</p>`}</section>
  <section class="card"><h2>Puntos flojos</h2>${
    weak.length
      ? `<ul class="plain">${weak
          .map((sub) => {
            const title = subconceptById(sub.id)?.title || conceptById(sub.conceptId)?.title || sub.id;
            return `<li><button type="button" class="btn ghost" data-act="start-weak" data-id="${esc(sub.id)}">${esc(title)}</button> <span class="muted">${Math.round(sub.recentAccuracy * 100)} % reciente</span></li>`;
          })
          .join("")}</ul>`
      : `<p class="muted">Hacen falta al menos dos intentos reales, sin reintento inmediato, para señalar un punto flojo.</p>`
  }</section>
  <section class="card"><h2>Confusiones que se repiten</h2>${
    flags.length
      ? `<ul class="plain">${flags.map((row) => `<li>${esc(row.title)} · ${row.total} fallos en 21 días</li>`).join("")}</ul>`
      : `<p class="muted">Ningún par del banco se ha repetido lo bastante en las últimas tres semanas.</p>`
  }</section>
  <section class="card"><h2>Próximos plazos</h2>${
    upcoming.length
      ? `<ul class="plain">${upcoming.map((item) => `<li>${esc(ymd(states[item.id].due))} · ${esc(subconceptById(item.subconceptId)?.title || item.id)}</li>`).join("")}</ul>`
      : `<p class="muted">Todavía no hay plazos futuros.</p>`
  }</section>`;
}

function progressPage() {
  const { progress, states, summary, days } = model();
  const prep = examPreparation(
    progress.sims,
    "ad",
    bank.concepts.filter((concept) => concept.subjectId === "ad").length,
  );
  const concepts = bank.concepts.filter((concept) => concept.subjectId === "ad" || concept.subjectId === JAVA_SUBJECT);
  const answered = progress.log.length;
  const correct = progress.log.filter((event: any) => event.r === "o").length;
  return `<section><h1>Mi progreso</h1><p class="lead">${answered} respuestas guardadas en este navegador. ${answered ? `${Math.round((correct / answered) * 100)} % marcadas como acierto.` : "Todavía no hay historial."}</p></section>
  <section class="card"><h2>Preparación de Acceso a Datos</h2><p>${esc(prep.message)}</p>${
    prep.n
      ? `<p>Última ${formatGrade(prep.last)} · media de las últimas ${Math.min(3, prep.n)} : ${formatGrade(prep.avg)} · mínima ${formatGrade(prep.min)} · temas tocados ${prep.topics} de ${prep.total}.${prep.trend == null ? "" : ` Cambio respecto al anterior: ${prep.trend >= 0 ? "+" : ""}${formatGrade(prep.trend)}.`}</p>`
      : ""
  }<p class="muted">Esto no es una probabilidad de aprobar.</p></section>
  <section class="card"><h2>Dominio por concepto</h2><div class="stack">${concepts
    .map((concept) => {
      const standing = summary.concepts[concept.id];
      return `<div class="row spread"><span>${esc(concept.title)}</span>${levelPill(standing?.level || 0)}</div>`;
    })
    .join("")}</div></section>
  <section class="card"><h2>Logros</h2><ul class="plain">${Object.entries(ACHIEVEMENT_LABELS)
    .map(([id, label]) => `<li>${progress.achievements.includes(id) ? "Conseguido" : "Pendiente"} · ${esc(label)}</li>`)
    .join("")}</ul><p class="muted">No hay ranking ni comparación con otras personas.</p></section>
  <section class="card"><h2>Actividad</h2><p>${Object.entries(progress.xpByDay).sort(([a], [b]) => b.localeCompare(a)).slice(0, 7).map(([day, xp]) => `${esc(day)} · ${xp} XP`).join(" | ")}</p><p>${Object.keys(days).length} días con alguna respuesta. Preguntas vistas: ${bank.items.filter((item) => states[item.id]?.n).length} de ${bank.items.length}.</p>
    <h3>Últimas respuestas</h3>
    ${
      progress.log.length
        ? `<ul class="plain">${progress.log
            .slice(-12)
            .reverse()
            .map((event: any) => `<li>${esc(formatWhen(event.t))} · ${esc(event.id)} · ${event.r === "o" ? "acierto" : event.r === "k" ? "fallo" : "en blanco"}${event.rt ? " · no cuenta para el dominio" : ""}</li>`)
            .join("")}</ul>`
        : `<p class="muted">Sin respuestas.</p>`
    }
  </section>
  <section class="card"><h2>Copia de seguridad</h2>
    <div class="row"><button type="button" class="btn" data-act="export">Exportar</button></div>
    <label for="import-file">Importar un JSON de Programate o de Mi Chuleta</label>
    <input id="import-file" type="file" accept="application/json,.json">
    <p class="muted">Importar no borra nada hasta que confirmes el reemplazo. Un archivo ilegible se rechaza.</p>
    <label for="goal">Objetivo diario opcional, en XP</label>
    <input id="goal" type="number" min="10" max="200" value="${progress.settings.dailyGoal}">
    <button type="button" class="btn ghost" data-act="save-goal">Guardar objetivo</button>
    ${progress.quarantine?.length ? `<p class="muted">${progress.quarantine.length} datos apartados dentro del archivo, fuera del cálculo.</p>` : ""}
    ${progress.overflow?.length ? `<p class="muted">${progress.overflow.length} respuestas antiguas conservadas en la exportación, fuera de las últimas 10.000.</p>` : ""}
  </section>`;
}

function plansPage() {
  const money = (cents: number) => (cents / 100).toFixed(2).replace(".", ",") + " €";
  const live = new Set(["content.core", "assessment.practice", "learning.srs", "progress.local"]);
  return `<section><h1>Planes</h1><p class="lead">${esc(plans.note)} Hoy el uso real es Free y local: no hay cuentas, cobros ni funciones de pago activas.</p></section>
  <div class="grid plans">${plans.plans
    .map((plan) => {
      const price = plan.prices[0];
      return `<article class="card plan"><p class="kicker">${plan.id === "free" ? "En uso" : "Más adelante"}</p><h2>${esc(plan.name)}</h2><p class="price">${money(price.amountCents)} <small>/ mes, importe de estudio</small></p><ul>${plans.features
        .map((feature) => {
          const grant = plan.grants[feature.id];
          const on = grant?.enabled && (feature.kind !== "quota" || (grant.limit ?? 0) > 0);
          const extra = feature.kind === "quota" ? ` (${grant?.limit ?? 0})` : "";
          const state = !on ? "No incluido" : live.has(feature.id) ? "Disponible" : "Preparado, aún no operativo";
          return `<li><b>${esc(state)}</b> ${esc(feature.description)}${esc(extra)}</li>`;
        })
        .join("")}</ul></article>`;
    })
    .join("")}</div>
  <section class="card"><p>No hay botón de pago. Sincronizar, el tutor y ejecutar código necesitan un servicio que esta versión no incluye. El objetivo de XP que hay en Progreso es local y no es el ajuste de ruta previsto para Pro. Si más adelante bajas de plan, el diseño conserva el progreso.</p></section>`;
}

function sessionPage() {
  const resume = getProgress().resume;
  if (!resume || !resume.ids?.length) {
    return `<section class="card"><h1>No hay sesión</h1><p>Elige un test, un simulacro o un repaso.</p><a class="btn" href="#/practicar">Practicar</a></section>`;
  }
  if (resume.stage === "done") return resultPage(resume);
  if (resume.mode === "sim" && resume.stage === "confirm") return timer(resume) + confirmPage(resume);
  const index = Math.min(resume.index || 0, resume.ids.length - 1);
  const id = resume.ids[index];
  const item = itemById(id);
  if (!item) return `<section class="card"><h1>Falta una pregunta</h1><p>La sesión cita ${esc(id)}, que no está en el banco. Puedes salir sin perder el resto del progreso.</p><button type="button" class="btn" data-act="forget">Salir</button></section>`;
  const key = resume.mode === "sim" ? item.id : `${item.id}#${index}`;
  const answer = resume.answers?.[key];
  const modeName = resume.mode === "sim" ? "Simulacro" : resume.mode === "due" ? "Repaso" : resume.mode === "errors" ? "Errores" : "Práctica";
  return `${timer(resume)}<section class="session">
    <div class="row spread"><p class="muted">${modeName} · ${index + 1} de ${resume.ids.length}</p><a class="btn ghost" href="#/">Guardar y salir</a></div>
    <div class="bar" aria-hidden="true"><span style="width:${((index + (answer ? 1 : 0)) / resume.ids.length) * 100}%"></span></div>
    <article class="card">
      <p class="kicker">${esc(subconceptById(item.subconceptId)?.title || conceptById(item.conceptId)?.title || "")}</p>
      <h1 id="qt">${rich(item.stem)}</h1>
      ${item.code ? `<pre class="code">${esc(item.code)}</pre>` : ""}
      ${resume.why?.[item.id] ? `<p class="muted">${esc(resume.why[item.id])}</p>` : ""}
      ${item.kind === "self-check" ? selfCheck(item, answer) : choices(item, answer, resume.mode === "sim")}
      <div id="feedback" tabindex="-1" aria-live="polite">${answer && resume.mode !== "sim" ? answer.hint ? `<div class="callout ko"><strong>Prueba otra vez</strong><p>${esc(item.examHint)}</p></div>` : feedback(item, answer) : ""}</div>
      <div class="row">${sessionButtons(item, answer, resume, index)}</div>
    </article>
  </section>`;
}

function timer(resume: any) {
  if (resume.mode !== "sim" || !Number.isFinite(resume.cfg?.deadline)) return "";
  return `<p class="timer">Tiempo restante · <span id="sim-timer" data-deadline="${resume.cfg.deadline}">Calculando…</span></p>`;
}

function choices(item: any, answer: any, hidden: boolean) {
  const type = item.multiple || (item.correct || []).length > 1 ? "checkbox" : "radio";
  const selected = new Set(answer?.sel || []);
  return `<div id="ops" role="group" aria-labelledby="qt">${(item.options || [])
    .map((option: any) => {
      const mark = selected.has(option.letter) ? "checked" : "";
      const locked = answer && !answer.hint && !hidden ? "disabled" : "";
      return `<label class="option ${answer && !answer.hint && !hidden ? optionClass(item, option.letter) : ""}"><input type="${type}" name="opt" value="${esc(option.letter)}" ${mark} ${locked}> <span><b>${esc(option.letter)})</b> ${rich(option.text)}</span></label>`;
    })
    .join("")}</div>`;
}

function optionClass(item: any, letter: string) {
  const correct = (item.correct || []).includes(letter);
  return correct ? "good" : "bad";
}

function selfCheck(item: any, answer: any) {
  if (!answer) return `<button type="button" class="btn" data-act="reveal-qa">Ver respuesta</button>`;
  return `<div class="callout">${rich(item.expectedAnswer || "Sin respuesta en el banco")}</div>${
    answer.r ? "" : `<div class="row"><button type="button" class="btn" data-act="qa-yes">Lo sabía</button><button type="button" class="btn ghost" data-act="qa-no">Repasar</button></div>`
  }`;
}

function feedback(item: any, answer: any) {
  const title = answer.r === "o" ? "Correcto" : answer.r === "k" ? "Incorrecto" : "Sin contestar";
  const options = (item.options || [])
    .filter((option: any) => option.rationale)
    .map((option: any) => `<li><b>${esc(option.letter)})</b> ${rich(option.rationale)}</li>`)
    .join("");
  return `<div class="callout ${answer.r === "o" ? "ok" : "ko"}"><b>${title}</b>${answer.note ? `<p>${esc(answer.note)}</p>` : ""}${item.generalRationale ? `<p>${rich(item.generalRationale)}</p>` : ""}${options ? `<ul>${options}</ul>` : ""}</div>`;
}

function sessionButtons(item: any, answer: any, resume: any, index: number) {
  if (resume.mode === "sim") {
    return `<button type="button" class="btn" data-act="sim-next">${index + 1 < resume.ids.length ? "Siguiente" : "Revisar"}</button><button type="button" class="btn ghost" data-act="sim-review">Entregar</button>`;
  }
  if (item.kind === "self-check") {
    return answer?.r ? `<button type="button" class="btn" data-act="next">${index + 1 < resume.ids.length ? "Siguiente" : "Ver resultado"}</button>` : "";
  }
  if (!answer || answer.hint) {
    return `<button type="button" class="btn" data-act="check">${answer?.hint ? "Reintentar" : "Comprobar"}</button><button type="button" class="btn ghost" data-act="blank">No lo sé</button>`;
  }
  return `<button type="button" class="btn" data-act="next">${index + 1 < resume.ids.length ? "Siguiente" : "Ver resultado"}</button>`;
}

function confirmPage(resume: any) {
  const blanks = resume.ids.filter((id: string) => !(resume.answers?.[id]?.sel || []).length).length;
  return `<section class="card"><h1>Revisar antes de entregar</h1><p>${blanks ? `Hay ${blanks} en blanco. En blanco no resta y no suma.` : "Has contestado todas."}</p>
    <div class="nums">${resume.ids
      .map((id: string, index: number) => {
        const done = (resume.answers?.[id]?.sel || []).length > 0;
        return `<button type="button" data-act="sim-goto" data-i="${index}" class="${done ? "on" : ""}">${index + 1}</button>`;
      })
      .join("")}</div>
    <div class="row"><button type="button" class="btn" data-act="sim-submit">Entregar simulacro</button><button type="button" class="btn ghost" data-act="sim-back">Volver a las preguntas</button></div>
  </section>`;
}

function resultPage(resume: any) {
  const result = resume.results || { ok: 0, ko: 0, bl: 0, wrongIds: [] };
  const exam = resume.mode === "sim";
  return `<section class="card"><h1>${exam ? "Resultado del simulacro" : "Resultado de la práctica"}</h1>
    <div class="grid three"><article class="card"><b>${result.ok}</b><span>aciertos</span></article><article class="card"><b>${result.ko}</b><span>fallos</span></article><article class="card"><b>${result.bl}</b><span>en blanco</span></article></div>
    ${exam ? `<p>Nota orientativa: <b>${formatGrade(result.grade || 0)}</b> sobre 10. Puntos ${result.score}. ${esc(result.label || "")}</p>` : `<p>En la práctica un acierto vale 1 y el resto 0. No es la nota del examen.</p>`}
    ${exam && result.wrongIds?.length ? `<section class="exam-errors"><h2>Qué repasar</h2>${result.wrongIds.map((id: string) => {
      const item = itemById(id);
      if (!item) return "";
      const solution = item.options?.filter((option) => item.correct?.includes(option.letter)).map((option) => option.text).join(" · ");
      return `<details><summary>${rich(item.stem)}</summary><p><strong>Respuesta:</strong> ${rich(solution)}</p>${item.generalRationale ? `<p>${rich(item.generalRationale)}</p>` : ""}${item.options?.filter((option) => option.rationale).map((option) => `<p>${esc(option.letter)}) ${rich(option.rationale)}</p>`).join("") || ""}</details>`;
    }).join("")}</section>` : ""}
    <div class="row"><button type="button" class="btn ghost" data-act="forget">Cerrar</button>${result.wrongIds?.length ? `<button type="button" class="btn" data-act="review-session-errors">Repasar errores</button>` : ""}<a class="btn ghost" href="#/progreso">Ver progreso</a>${resume.subjectId === JAVA_SUBJECT ? `<a href="#/mi-ruta">Volver al itinerario Java</a>` : ""}</div>
  </section>`;
}
