import assert from "node:assert/strict";
import test from "node:test";
import { reviewStatusAllowed } from "./import-policy.mjs";

test("una importación automática no puede darse por revisada", () => {
  for (const generator of ["claude", "script"]) {
    assert.equal(reviewStatusAllowed(generator, "extracted"), true);
    assert.equal(reviewStatusAllowed(generator, "needs-review"), true);
    assert.equal(reviewStatusAllowed(generator, "reviewed"), false);
    assert.equal(reviewStatusAllowed(generator, "verified-by-execution"), false);
    assert.equal(reviewStatusAllowed(generator, "retired"), false);
  }
});

test("una extracción humana puede registrar una revisión ya hecha", () => {
  assert.equal(reviewStatusAllowed("human-extraction", "reviewed"), true);
  assert.equal(reviewStatusAllowed("human-extraction", "verified-by-execution"), true);
});
