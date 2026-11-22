import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { catalogReadyToCharge } from "../engine/billing.mjs";
import { reviewStatusAllowed } from "./import-policy.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const fail = (message) => errors.push(message);

const SCHEMA_IDS = {
  sources: "https://programate.local/schemas/source.schema.json",
  concepts: "https://programate.local/schemas/concept.schema.json",
  terms: "https://programate.local/schemas/term.schema.json",
  items: "https://programate.local/schemas/item.schema.json",
  lessons: "https://programate.local/schemas/lesson.schema.json",
  exercises: "https://programate.local/schemas/exercise.schema.json",
  competencies: "https://programate.local/schemas/competency.schema.json",
  routes: "https://programate.local/schemas/route.schema.json",
  scoringProfiles: "https://programate.local/schemas/scoring-profile.schema.json",
};

const LEGACY_ID = /^(ad-n|ad|di|sge|psp)[0-9]+$/;
const FROZEN_SOURCE = "src.michuleta-dam-2.0";

function readJson(abs, label) {
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (error) {
    fail(`${label}: JSON inválido (${error.message})`);
    return null;
  }
}

function loadAjv() {
  const ajv = new Ajv({
    allErrors: true,
    strict: true,
    strictRequired: false,
  });
  addFormats(ajv);
  const dir = path.join(root, "schemas");
  const names = fs.readdirSync(dir).filter((name) => name.endsWith(".json"));
  const defs = names.filter((name) => name.startsWith("defs."));
  const rest = names.filter((name) => !name.startsWith("defs."));
  for (const name of [...defs, ...rest]) {
    ajv.addSchema(readJson(path.join(dir, name), `schemas/${name}`));
  }
  return ajv;
}

function explain(label, validate) {
  for (const error of validate.errors || []) {
    fail(`${label}${error.instancePath || ""} ${error.message}`);
  }
}

function checkSchema(ajv, schemaId, data, label) {
  const validate = ajv.getSchema(schemaId);
  if (!validate) {
    fail(`Falta el esquema ${schemaId}`);
    return;
  }
  if (!validate(data)) explain(label, validate);
}

function walkJson(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJson(abs, found);
    else if (entry.name.endsWith(".json")) found.push(abs);
  }
  return found;
}

function stringsOf(value, found = []) {
  if (typeof value === "string") found.push(value);
  else if (Array.isArray(value)) value.forEach((item) => stringsOf(item, found));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => stringsOf(item, found));
  return found;
}

function loadHtmlData() {
  const htmlPath = path.join(root, "sources", "MiChuleta_DAM_2.0.html");
  if (!fs.existsSync(htmlPath)) {
    console.log("Omitido: sources/MiChuleta_DAM_2.0.html no está en esta copia. No se compara el ejemplo con el HTML privado.");
    return { html: "", data: null };
  }
  const html = fs.readFileSync(htmlPath, "utf8");
  const marker = html.indexOf("__DATA=");
  if (marker < 0) {
    fail("La fuente no contiene __DATA");
    return { html, data: null };
  }
  let raw = html.slice(marker + "__DATA=".length, html.indexOf("</script>", marker)).trim();
  if (raw.endsWith(";")) raw = raw.slice(0, -1);
  return { html, data: JSON.parse(raw) };
}

function same(label, got, expected) {
  if (got !== expected) fail(`${label} no coincide con la fuente`);
}

function compareConcept(label, concept, source) {
  same(`${label} title`, concept.title, source.n);
  same(`${label} topic`, concept.topic, source.t);
  same(`${label} confusion`, concept.confusion, source.conf);
  same(`${label} subjectId`, concept.subjectId, source.s);
}

function compareTerm(label, term, entry) {
  same(`${label} title`, term.title, entry.t);
  same(`${label} legacyTitle`, term.legacyTitle, entry.t);
  same(`${label} subjectId`, term.subjectId, entry.a);
  same(`${label} topic`, term.topic, entry.g);
  same(`${label} definition`, term.definition, entry.d);
  same(`${label} analogy`, term.analogy, entry.f);
  same(`${label} examCue`, term.examCue, entry.e);
  same(`${label} snippet`, term.snippet, entry.x);
}

function compareItem(label, item, question) {
  same(`${label} stem`, item.stem, question.q);
  same(`${label} subjectId`, item.subjectId, question.s);
  same(`${label} conceptId`, item.conceptId, question.c);
  same(`${label} difficulty`, item.difficulty, question.d);
  if (question.k === "qa") {
    same(`${label} kind`, item.kind, "self-check");
    same(`${label} expectedAnswer`, item.expectedAnswer, question.a);
    return;
  }
  same(`${label} kind`, item.kind, "multiple-choice");
  same(`${label} options`, JSON.stringify(item.options.map((option) => option.text)), JSON.stringify(question.o));
  same(`${label} correct`, JSON.stringify(item.correct), JSON.stringify(question.a));
  for (const option of item.options) {
    const expected = question.ox ? question.ox[option.letter] || "" : "";
    same(`${label} rationale ${option.letter}`, option.rationale || "", expected);
  }
  same(`${label} multiple`, item.multiple, !!question.m);
  same(`${label} presentsCode`, item.presentsCode, !!question.cod);
  same(`${label} generalRationale`, item.generalRationale || "", question.w || "");
  same(`${label} example`, item.example || "", question.ej || "");
  same(`${label} examHint`, item.examHint || "", question.tr || "");
  same(`${label} code`, item.code || "", question.code || "");
  same(`${label} bankLabel`, item.bankLabel || "", question.b || "");
  same(`${label} origin`, item.origin, question.src || "unspecified");
  same(`${label} verification`, item.verification || "", question.ver || "");
}

function indexBy(list, key) {
  const map = new Map();
  for (const item of list) {
    if (map.has(item[key])) fail(`Identificador repetido: ${item[key]}`);
    map.set(item[key], item);
  }
  return map;
}

function main() {
  const ajv = loadAjv();
  const packPath = path.join(root, "examples", "content-pack.json");
  const pack = readJson(packPath, "examples/content-pack.json");
  if (!pack) return finish();
  checkSchema(ajv, "https://programate.local/schemas/content-pack.schema.json", pack, "content-pack");

  const listed = new Map();
  for (const [bucket, files] of Object.entries(pack.files || {})) {
    for (const rel of files) {
      if (listed.has(rel)) fail(`Ruta repetida en el paquete: ${rel}`);
      listed.set(rel, bucket);
    }
  }

  const loaded = {
    sources: [],
    concepts: [],
    terms: [],
    items: [],
    lessons: [],
    exercises: [],
    competencies: [],
    routes: [],
    scoringProfiles: [],
  };

  for (const [rel, bucket] of listed) {
    const abs = path.join(root, "examples", rel);
    if (!fs.existsSync(abs)) {
      fail(`Falta el archivo ${rel}`);
      continue;
    }
    const data = readJson(abs, rel);
    if (!data) continue;
    checkSchema(ajv, SCHEMA_IDS[bucket], data, rel);
    loaded[bucket].push(data);
    if (data.revision && !reviewStatusAllowed(pack.generator, data.revision.status)) {
      fail(`${rel}: el generador ${pack.generator} no puede marcar el estado ${data.revision.status}`);
    }
    for (const text of stringsOf(data)) {
      if (/<script/i.test(text)) fail(`${rel}: hay una etiqueta script`);
    }
  }

  const examplesDir = path.join(root, "examples");
  const onDisk = new Set(walkJson(examplesDir).map((abs) => path.relative(examplesDir, abs).split(path.sep).join("/")));
  const expected = new Set(["content-pack.json", ...listed.keys()]);
  for (const abs of walkJson(path.join(examplesDir, "progress"))) {
    const rel = path.relative(examplesDir, abs).split(path.sep).join("/");
    expected.add(rel);
    const data = readJson(abs, rel);
    if (!data) continue;
    checkSchema(ajv, "https://programate.local/schemas/progress-event.schema.json", data, rel);
  }
  for (const rel of onDisk) {
    if (!expected.has(rel)) fail(`JSON sin registrar en el paquete ni en progress/: ${rel}`);
  }
  for (const rel of expected) {
    if (!onDisk.has(rel)) fail(`El paquete cita ${rel}, pero no está en examples/`);
  }

  const sources = indexBy(loaded.sources, "id");
  const concepts = indexBy(loaded.concepts, "id");
  const terms = indexBy(loaded.terms, "id");
  const items = indexBy(loaded.items, "id");
  const lessons = indexBy(loaded.lessons, "id");
  const profiles = indexBy(loaded.scoringProfiles, "id");
  const routes = indexBy(loaded.routes, "id");
  const competencies = indexBy(loaded.competencies, "id");

  const { html, data } = loadHtmlData();
  const canCompare = Boolean(data);
  const quizById = new Map((data?.quiz || []).map((question) => [question.id, question]));

  for (const source of loaded.sources) {
    const abs = path.resolve(root, source.localPath);
    const relative = path.relative(root, abs);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      fail(`${source.id}: localPath sale del repositorio`);
      continue;
    }
    if (!fs.existsSync(abs)) {
      console.log(`Omitido: ${source.localPath} no está. No se comprueba el hash en esta copia.`);
      continue;
    }
    const bytes = fs.readFileSync(abs);
    const hash = crypto.createHash("sha256").update(bytes).digest("hex");
    if (hash !== source.sha256) fail(`${source.id}: el sha256 no coincide. El HTML de la fuente ha cambiado o el registro es incorrecto.`);
    if (bytes.length !== source.bytes) fail(`${source.id}: el tamaño no coincide`);
    if (source.personalData && source.redistribution === "cleared") {
      fail(`${source.id}: una fuente con datos personales no puede marcarse como redistribuible`);
    }
  }

  for (const concept of loaded.concepts) {
    const source = canCompare ? data.concepts[concept.id] : null;
    if (source) {
      compareConcept(concept.id, concept, source);
      const expectedTerms = source.terms || [];
      const gotTerms = concept.termIds.map((id) => terms.get(id)?.legacyTitle);
      same(`${concept.id} terms`, JSON.stringify(gotTerms), JSON.stringify(expectedTerms));
    } else if (canCompare && concept.provenance.sourceId === FROZEN_SOURCE) {
      fail(`${concept.id}: se atribuye a la fuente congelada, pero ese concepto no existe allí`);
    }
    for (const termId of concept.termIds) {
      const term = terms.get(termId);
      if (!term) fail(`${concept.id}: falta el término ${termId}`);
      else if (!term.conceptIds.includes(concept.id)) fail(`${termId} no apunta de vuelta a ${concept.id}`);
    }
    for (const id of concept.prerequisiteIds) if (!concepts.has(id)) fail(`${concept.id}: prerrequisito desconocido ${id}`);
    for (const id of concept.competencyIds) if (!competencies.has(id)) fail(`${concept.id}: competencia desconocida ${id}`);
    if (!sources.has(concept.provenance.sourceId)) fail(`${concept.id}: fuente desconocida`);
  }

  for (const term of loaded.terms) {
    const entry = canCompare ? data.dic.find((item) => item.t === term.legacyTitle && item.a === term.subjectId) : null;
    if (entry) compareTerm(term.id, term, entry);
    else if (canCompare && term.provenance.sourceId === FROZEN_SOURCE) fail(`${term.id}: no está en el diccionario de la fuente`);
    if (!sources.has(term.provenance.sourceId)) fail(`${term.id}: fuente desconocida`);
    for (const id of term.conceptIds) if (!concepts.has(id)) fail(`${term.id}: concepto desconocido ${id}`);
  }

  for (const item of loaded.items) {
    const question = quizById.get(item.id);
    if (canCompare) {
      if (question) {
        if (!item.legacy) fail(`${item.id}: existe en la fuente y debe marcarse legacy`);
        compareItem(item.id, item, question);
      } else if (item.legacy || LEGACY_ID.test(item.id)) {
        fail(`${item.id}: un identificador del banco no puede reutilizarse ni inventarse`);
      } else if (!item.id.startsWith("item.")) {
        fail(`${item.id}: una pregunta nueva usa el prefijo item.`);
      }
    }
    if (item.kind === "multiple-choice") {
      const letters = item.options.map((option) => option.letter).join("");
      if (letters !== "abcdef".slice(0, item.options.length)) fail(`${item.id}: las letras de las opciones no van en orden`);
      if (item.correct.some((letter) => !letters.includes(letter))) fail(`${item.id}: una respuesta correcta no está entre las opciones`);
      if (item.multiple !== item.correct.length > 1) fail(`${item.id}: multiple no coincide con el número de respuestas`);
      if (item.subjectId === "ad" && item.options.some((option) => !option.rationale)) {
        fail(`${item.id}: en Acceso a Datos cada opción lleva explicación`);
      }
      if (item.scoringProfileId && !profiles.has(item.scoringProfileId)) fail(`${item.id}: perfil de puntuación desconocido`);
    }
    if (!concepts.has(item.conceptId)) fail(`${item.id}: concepto desconocido`);
    if (!sources.has(item.provenance.sourceId)) fail(`${item.id}: fuente desconocida`);
  }

  for (const lesson of loaded.lessons) {
    for (const id of lesson.conceptIds) if (!concepts.has(id)) fail(`${lesson.id}: concepto desconocido ${id}`);
    for (const id of lesson.routeIds) if (!routes.has(id)) fail(`${lesson.id}: itinerario desconocido ${id}`);
    const blockItems = [];
    const blockIds = new Set();
    for (const block of lesson.blocks) {
      if (blockIds.has(block.id)) fail(`${lesson.id}: bloque repetido ${block.id}`);
      blockIds.add(block.id);
      if (block.type === "term" && !terms.has(block.termId)) fail(`${lesson.id}: término desconocido ${block.termId}`);
      if (block.type === "item") {
        if (!items.has(block.itemId)) fail(`${lesson.id}: pregunta desconocida ${block.itemId}`);
        blockItems.push(block.itemId);
      }
    }
    same(`${lesson.id} included`, JSON.stringify(blockItems), JSON.stringify(lesson.sample.includedItemIds));
    for (const id of lesson.sample.includedItemIds) {
      if (!lesson.sample.knownSourceItemIds.includes(id)) fail(`${lesson.id}: ${id} está incluida y no consta entre las de la fuente`);
    }
    for (const id of lesson.sample.knownSourceItemIds) {
      if (!canCompare) continue;
      const question = quizById.get(id);
      if (!question) fail(`${lesson.id}: ${id} no está en la fuente`);
      else if (!lesson.conceptIds.includes(question.c)) fail(`${lesson.id}: ${id} pertenece a ${question.c}, no a esta lección`);
    }
    if (canCompare && lesson.conceptIds.length === 1 && data.concepts[lesson.conceptIds[0]]) {
      same(`${lesson.id} title`, lesson.title, concepts.get(lesson.conceptIds[0]).title);
    }
    if (!sources.has(lesson.provenance.sourceId)) fail(`${lesson.id}: fuente desconocida`);
  }

  for (const route of loaded.routes) {
    for (const step of route.steps) {
      const lesson = lessons.get(step.lessonId);
      if (!lesson) fail(`${route.id}: lección desconocida ${step.lessonId}`);
      else if (!lesson.routeIds.includes(route.id)) fail(`${step.lessonId} no declara el itinerario ${route.id}`);
    }
    if (canCompare && route.provenance.sourceId === FROZEN_SOURCE && !html.includes(route.sourceStatement)) {
      fail(`${route.id}: sourceStatement no aparece en la fuente`);
    }
    if (!sources.has(route.provenance.sourceId)) fail(`${route.id}: fuente desconocida`);
  }

  for (const competency of loaded.competencies) {
    for (const id of competency.conceptIds) if (!concepts.has(id)) fail(`${competency.id}: concepto desconocido ${id}`);
    if (canCompare && competency.provenance.sourceId === FROZEN_SOURCE && !html.includes(competency.sourceLabel)) {
      fail(`${competency.id}: la etiqueta no aparece en la fuente`);
    }
    if (!sources.has(competency.provenance.sourceId)) fail(`${competency.id}: fuente desconocida`);
  }

  for (const profile of loaded.scoringProfiles) {
    if (canCompare && profile.provenance.sourceId === FROZEN_SOURCE && !html.includes(profile.sourceStatement)) {
      fail(`${profile.id}: sourceStatement no aparece en la fuente`);
    }
    if (!sources.has(profile.provenance.sourceId)) fail(`${profile.id}: fuente desconocida`);
  }

  for (const exercise of loaded.exercises) {
    if (exercise.kind === "write-code" && exercise.runtime !== "isolated-worker") {
      fail(`${exercise.id}: escribir código exige runtime aislado`);
    }
    for (const id of exercise.conceptIds) if (!concepts.has(id)) fail(`${exercise.id}: concepto desconocido`);
  }

  validatePlanCatalog(ajv, loaded.exercises);

  const published = JSON.stringify(loaded);
  const needlesPath = path.join(root, "sources", "privacy-needles.local.txt");
  if (!fs.existsSync(needlesPath)) {
    console.log("Omitido: sources/privacy-needles.local.txt no está. No se busca el nombre en el ejemplo.");
  } else {
    for (const needle of fs.readFileSync(needlesPath, "utf8").split(/\r?\n/)) {
      const text = needle.trim();
      if (text && published.includes(text)) fail("El paquete de ejemplo contiene un dato de la lista local de nombres");
    }
  }

  finish(listed.size);
}

function validatePlanCatalog(ajv, exercises) {
  const label = "config/plans.study.json";
  const catalog = readJson(path.join(root, "config", "plans.study.json"), label);
  if (!catalog) return;
  checkSchema(ajv, "https://programate.local/schemas/plan-catalog.schema.json", catalog, label);
  const charge = catalogReadyToCharge(catalog);
  if (charge.ok) fail(`${label}: la pasarela figura como lista para cobrar`);
  if (catalog.billingProvider?.activated !== false) fail(`${label}: Stripe tiene que seguir desactivado`);
  if (catalog.organizations?.implemented !== false) fail(`${label}: las suscripciones de centro siguen sin implementar`);

  const featureIds = (catalog.features || []).map((feature) => feature.id);
  const byId = new Map((catalog.features || []).map((feature) => [feature.id, feature]));
  if (new Set(featureIds).size !== featureIds.length) fail(`${label}: hay permisos repetidos`);
  const planIds = (catalog.plans || []).map((plan) => plan.id);
  for (const id of ["free", "pro", "premium"]) {
    if (!planIds.includes(id)) fail(`${label}: falta el plan ${id}`);
  }

  for (const plan of catalog.plans || []) {
    const grantIds = Object.keys(plan.grants || {});
    if (grantIds.slice().sort().join() !== featureIds.slice().sort().join()) {
      fail(`${plan.id}: los permisos del plan no coinciden con el catálogo`);
    }
    for (const price of plan.prices || []) {
      if (price.priceStatus !== "study") fail(`${plan.id}: el precio todavía es de estudio`);
      if (price.stripePriceId) fail(`${plan.id}: no hay identificador de Stripe mientras la pasarela está apagada`);
    }
    const monthly = (plan.prices || []).find((price) => price.interval === "month");
    if (!monthly) fail(`${plan.id}: falta el precio mensual de estudio`);
    if (plan.id === "free" && monthly && monthly.amountCents !== 0) fail("free: el importe de estudio es 0");
    for (const featureId of featureIds) {
      const feature = byId.get(featureId);
      const grant = plan.grants[featureId];
      if (!grant) continue;
      if (feature.kind === "boolean" && grant.limit != null) fail(`${plan.id} ${featureId}: un permiso booleano no lleva cupo`);
      if (feature.kind === "quota" && !Number.isInteger(grant.limit)) fail(`${plan.id} ${featureId}: falta el cupo`);
    }
    for (const featureId of catalog.policies?.coreFeatureIds || []) {
      if (plan.grants?.[featureId]?.enabled !== true) fail(`${plan.id}: ${featureId} tiene que estar incluido`);
    }
  }

  const free = catalog.plans?.find((plan) => plan.id === "free");
  const pro = catalog.plans?.find((plan) => plan.id === "pro");
  const premium = catalog.plans?.find((plan) => plan.id === "premium");
  if (!free || !pro || !premium) return;
  for (const feature of catalog.features || []) {
    if (feature.kind === "boolean" && free.grants[feature.id]?.enabled === true) {
      if (pro.grants[feature.id]?.enabled !== true || premium.grants[feature.id]?.enabled !== true) {
        fail(`${feature.id}: un permiso abierto en Free sigue abierto en los planes de pago`);
      }
    }
    if (feature.kind === "quota") {
      const limits = [free, pro, premium].map((plan) => plan.grants[feature.id]?.limit);
      if (limits[1] < limits[0] || limits[2] < limits[1]) fail(`${feature.id}: el cupo no crece de Free a Premium`);
    }
  }
  for (const exercise of exercises || []) {
    if (exercise.capability && !byId.has(exercise.capability)) {
      fail(`${exercise.id}: el permiso ${exercise.capability} no está en el catálogo`);
    }
  }
}

function finish(count = 0) {
  if (errors.length) {
    console.error(`Validación fallida (${errors.length}):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Validación correcta: ${count} archivos de contenido, catálogo de planes, esquemas, referencias y copia íntegra de la fuente.`);
}

main();
