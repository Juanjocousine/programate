import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  authorize,
  blankUsage,
  catalogReadyToCharge,
  commitUsage,
  effectivePlanId,
  mergeGrants,
  monthlyPrice,
  progressAfterPlanChange,
  releaseUsage,
  reserveUsage,
  resolveEntitlements,
  withinProviderBudget,
} from "./billing.mjs";

const catalog = JSON.parse(readFileSync(new URL("../config/plans.study.json", import.meta.url), "utf8"));
const policies = catalog.policies;
const day = 86400000;
const start = Date.parse("2026-11-01T00:00:00Z");
const end = Date.parse("2026-12-01T00:00:00Z");

function subscription(overrides) {
  return {
    id: "sub_study",
    accountId: "acct_study",
    planId: "premium",
    status: "active",
    currentPeriodStart: start,
    currentPeriodEnd: end,
    cancelAtPeriodEnd: false,
    provider: "none",
    ...overrides,
  };
}

test("el catálogo de estudio no está listo para cobrar", () => {
  assert.equal(monthlyPrice(catalog, "free").amountCents, 0);
  assert.equal(monthlyPrice(catalog, "free").priceStatus, "study");
  assert.equal(monthlyPrice(catalog, "pro").priceStatus, "study");
  assert.equal(monthlyPrice(catalog, "premium").priceStatus, "study");
  assert.deepEqual(catalogReadyToCharge(catalog), { ok: false, reason: "not-activated" });
  assert.equal(withinProviderBudget(100, null).unconfigured, true);
  assert.equal(withinProviderBudget(100, 50).ok, false);
});

test("sin suscripción el plan efectivo es free y el contenido básico sigue abierto", () => {
  const resolved = resolveEntitlements({ catalog, now: start });
  assert.equal(resolved.planId, "free");
  assert.equal(resolved.grants["content.core"].enabled, true);
  assert.equal(resolved.grants["assessment.practice"].enabled, true);
  assert.equal(resolved.grants["learning.srs"].enabled, true);
  assert.equal(resolved.grants["progress.local"].enabled, true);
  assert.equal(resolved.grants["tutor.turns"].limit, 0);
  assert.equal(resolved.organizationApplied, false);
});

test("una plaza de centro no cambia permisos mientras la función no está implementada", () => {
  const resolved = resolveEntitlements({
    catalog,
    now: start,
    organizationSeat: { status: "active", planId: "premium" },
  });
  assert.equal(resolved.planId, "free");
  assert.equal(resolved.grants["practice.professional"].enabled, false);
});

test("alta, periodo pagado, fallo de pago, cancelación y cambio de plan", () => {
  assert.equal(effectivePlanId(subscription({ status: "incomplete" }), start, policies), "free");
  assert.equal(effectivePlanId(subscription({ status: "trialing", trialEndsAt: start + day }), start, policies), "premium");
  assert.equal(effectivePlanId(subscription(), start + day, policies), "premium");
  assert.equal(
    effectivePlanId(subscription({ status: "past_due", graceEndsAt: end + 3 * day }), end + day, policies),
    "premium",
  );
  assert.equal(
    effectivePlanId(subscription({ status: "past_due", graceEndsAt: end + day }), end + 2 * day, policies),
    "free",
  );
  assert.equal(
    effectivePlanId(subscription({ status: "canceled", cancelAtPeriodEnd: true }), end - day, policies),
    "premium",
  );
  assert.equal(
    effectivePlanId(subscription({ status: "canceled" }), end + 7 * day, policies),
    "free",
  );
  assert.equal(
    effectivePlanId(subscription({ scheduledPlanId: "pro" }), end - day, policies),
    "premium",
  );
  assert.equal(
    effectivePlanId(subscription({ scheduledPlanId: "pro" }), end + 7 * day, policies),
    "pro",
  );
  assert.equal(effectivePlanId(subscription({ status: "expired" }), start, policies), "free");
  assert.equal(effectivePlanId(subscription({ status: "paused" }), start, policies), "free");
});

test("bajar de Premium a Free conserva el registro", () => {
  const events = [{ id: "ad01", r: "o", t: start }];
  const after = progressAfterPlanChange(events);
  assert.equal(after, events);
  const resolved = resolveEntitlements({
    catalog,
    subscription: subscription({ status: "expired" }),
    now: end,
  });
  assert.equal(resolved.planId, "free");
  assert.equal(resolved.progressRetained, true);
  assert.equal(resolved.grants["learning.srs"].enabled, true);
});

test("la autorización usa el permiso, no el nombre del plan", () => {
  const freeTutor = resolveEntitlements({ catalog, now: start }).grants["tutor.turns"];
  assert.equal(authorize(freeTutor, { cost: 1 }).reason, "quota");
  const premium = resolveEntitlements({
    catalog,
    subscription: subscription(),
    now: start,
  }).grants;
  assert.equal(authorize(premium["content.core"]).ok, true);
  assert.equal(authorize(premium["tutor.turns"], { used: 299, cost: 1 }).ok, true);
  assert.equal(authorize(premium["tutor.turns"], { used: 300, cost: 1 }).reason, "quota");
  assert.equal(authorize(premium["practice.professional"]).ok, true);
  assert.equal(authorize({ enabled: false }).reason, "not-included");
});

test("reservar, confirmar y soltar consumo no cuenta dos veces la misma clave", () => {
  const limit = 2;
  const held = reserveUsage(blankUsage(), { key: "job-1", cost: 1, limit });
  assert.equal(held.ok, true);
  const again = reserveUsage(held.usage, { key: "job-1", cost: 1, limit });
  assert.equal(again.duplicate, true);
  assert.equal(again.usage.reserved, 1);
  const blocked = reserveUsage(held.usage, { key: "job-2", cost: 2, limit });
  assert.equal(blocked.reason, "quota");
  const committed = commitUsage(held.usage, "job-1");
  assert.equal(committed.usage.used, 1);
  assert.equal(committed.usage.reserved, 0);
  assert.equal(commitUsage(committed.usage, "job-1").duplicate, true);
  assert.equal(committed.usage.used, 1);
  const released = releaseUsage(held.usage, "job-1");
  assert.equal(released.usage.reserved, 0);
  assert.equal(released.usage.used, 0);
});

test("dos orígenes de permiso se quedan con el más amplio", () => {
  const merged = mergeGrants(
    { "tutor.turns": { enabled: true, limit: 80 }, "practice.professional": { enabled: false } },
    { "tutor.turns": { enabled: true, limit: 300 }, "practice.professional": { enabled: true } },
  );
  assert.equal(merged["tutor.turns"].limit, 300);
  assert.equal(merged["practice.professional"].enabled, true);
});
