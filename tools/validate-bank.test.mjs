import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { neutralizePersonal } from "./publish-text.mjs";

const html20 = "sources/MiChuleta_DAM_2.0.html";
const html21 = "sources/MiChuleta_DAM_2.1.html";
const hasPrivateHtml = fs.existsSync(html20) && fs.existsSync(html21);

function load(file) {
  const html = fs.readFileSync(file, "utf8");
  const marker = html.indexOf("__DATA=");
  let raw = html.slice(marker + "__DATA=".length, html.indexOf("</script>", marker)).trim();
  if (raw.endsWith(";")) raw = raw.slice(0, -1);
  return JSON.parse(raw);
}

if (hasPrivateHtml) {
  const extracted = spawnSync(process.execPath, ["tools/extract-bank.mjs"], { encoding: "utf8" });
  if (extracted.status !== 0) {
    throw new Error(extracted.stderr || extracted.stdout || "extract-bank falló");
  }
}

function bank() {
  return JSON.parse(fs.readFileSync("content/bank.json", "utf8"));
}

test("el banco publicado conserva las preguntas y no lleva referencias personales", () => {
  const data = bank();
  const isolated = JSON.parse(fs.readFileSync("content/isolated.json", "utf8"));
  assert.equal(new Set(data.items.map((item) => item.id)).size, data.items.length);
  assert.equal(data.items.length, 305);
  assert.equal(isolated.items.length, 0);
  assert.equal(data.docs, undefined);
  const packed = JSON.stringify(data);
  for (const phrase of ["tu práctica", "tus prácticas", "tu carpeta", "tus apuntes", "tus intentos", "Aules", "del profe"]) {
    assert.equal(packed.includes(phrase), false, phrase);
  }
  const needlesPath = "sources/privacy-needles.local.txt";
  if (fs.existsSync(needlesPath)) {
    for (const needle of fs.readFileSync(needlesPath, "utf8").split(/\r?\n/)) {
      const text = needle.trim();
      if (text) assert.equal(packed.includes(text), false, "dato de la lista local");
    }
  }
  for (const id of ["ad34", "ad41", "ad51", "sge223"]) assert.ok(data.items.some((item) => item.id === id), id);
  assert.equal(data.items.some((item) => item.localContext), false);
  assert.ok(data.items.some((item) => item.id.startsWith("dig")));
  const ad01 = data.items.find((item) => item.id === "ad01");
  assert.match(ad01.options.find((option) => option.letter === "c").rationale, /ArrayList/);
  for (const item of data.items) assert.ok(data.concepts.some((concept) => concept.id === item.conceptId));
});

test(
  "el banco coincide con los HTML privados cuando están en el ordenador",
  { skip: hasPrivateHtml ? false : "Omitido: los HTML privados no están en esta copia." },
  () => {
    const v20 = load(html20);
    const v21 = load(html21);
    const data = bank();
    const byId = new Map(data.items.map((item) => [item.id, item]));
    assert.equal(data.items.length + JSON.parse(fs.readFileSync("content/isolated.json", "utf8")).items.length, v21.quiz.length);
    for (const question of v20.quiz) {
      const item = byId.get(question.id);
      assert.ok(item, question.id);
      assert.equal(item.stem, neutralizePersonal(question.q));
      if (question.k === "qa") {
        assert.equal(item.expectedAnswer, neutralizePersonal(String(question.a ?? "")));
      } else {
        assert.deepEqual(
          item.options.map((option) => option.text),
          question.o.map((text) => neutralizePersonal(String(text))),
        );
        assert.deepEqual(item.correct, question.a);
      }
    }
    assert.equal(v20.quiz.every((question) => byId.has(question.id)), true);
  },
);
