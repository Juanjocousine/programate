/**
 * Permisos de plan. Los límites salen del catálogo, no de comparaciones
 * repartidas por la interfaz. Cobrar con Stripe no está activado.
 */

const HOUR_MS = 3600000;

export function monthlyPrice(catalog, planId) {
  const plan = catalog.plans.find((item) => item.id === planId);
  return plan.prices.find((price) => price.interval === "month");
}

export function effectivePlanId(subscription, now, policies) {
  if (!subscription) return "free";
  const grace = (policies.renewalGraceHours ?? 0) * HOUR_MS;
  if (subscription.status === "incomplete" || subscription.status === "expired" || subscription.status === "paused") {
    return "free";
  }
  if (subscription.status === "past_due") {
    if (subscription.graceEndsAt != null && now <= subscription.graceEndsAt) return subscription.planId;
    return "free";
  }
  if (subscription.status === "trialing") {
    if (subscription.trialEndsAt != null && now <= subscription.trialEndsAt) return subscription.planId;
    return "free";
  }
  if (subscription.status === "active" || subscription.status === "canceled") {
    if (now <= subscription.currentPeriodEnd + grace) return subscription.planId;
    if (subscription.scheduledPlanId) return subscription.scheduledPlanId;
    return "free";
  }
  return "free";
}

export function grantsFor(catalog, planId) {
  const plan = catalog.plans.find((item) => item.id === planId);
  if (!plan) throw new Error(`Plan desconocido: ${planId}`);
  return plan.grants;
}

export function mergeGrants(left, right) {
  const ids = new Set([...Object.keys(left), ...Object.keys(right)]);
  const merged = {};
  for (const id of ids) {
    const a = left[id];
    const b = right[id];
    if (!a) merged[id] = b;
    else if (!b) merged[id] = a;
    else if (a.limit == null && b.limit == null) merged[id] = { enabled: a.enabled || b.enabled };
    else merged[id] = { enabled: a.enabled || b.enabled, limit: Math.max(a.limit ?? 0, b.limit ?? 0) };
  }
  return merged;
}

export function resolveEntitlements({ catalog, subscription = null, organizationSeat = null, now }) {
  const planId = effectivePlanId(subscription, now, catalog.policies);
  let grants = grantsFor(catalog, planId);
  let organizationApplied = false;
  if (catalog.organizations.implemented && organizationSeat?.status === "active") {
    grants = mergeGrants(grants, grantsFor(catalog, organizationSeat.planId));
    organizationApplied = true;
  }
  return {
    planId,
    grants,
    organizationApplied,
    progressRetained: catalog.policies.progressRetainedOnDowngrade === true,
  };
}

export function authorize(grant, { used = 0, reserved = 0, cost = 1 } = {}) {
  if (!grant || grant.enabled !== true) return { ok: false, reason: "not-included" };
  if (grant.limit == null) return { ok: true };
  const remaining = grant.limit - used - reserved;
  if (cost > remaining) return { ok: false, reason: "quota", remaining: Math.max(0, remaining) };
  return { ok: true, remaining: remaining - cost };
}

export function blankUsage() {
  return { used: 0, reserved: 0, reservations: {} };
}

export function reserveUsage(usage, { key, cost, limit }) {
  const existing = usage.reservations[key];
  if (existing) return { ok: true, duplicate: true, usage };
  if (usage.used + usage.reserved + cost > limit) return { ok: false, reason: "quota", usage };
  return {
    ok: true,
    usage: {
      used: usage.used,
      reserved: usage.reserved + cost,
      reservations: { ...usage.reservations, [key]: { cost, state: "reserved" } },
    },
  };
}

export function commitUsage(usage, key) {
  const reservation = usage.reservations[key];
  if (!reservation) return { ok: false, reason: "unknown", usage };
  if (reservation.state === "committed") return { ok: true, duplicate: true, usage };
  if (reservation.state !== "reserved") return { ok: false, reason: reservation.state, usage };
  return {
    ok: true,
    usage: {
      used: usage.used + reservation.cost,
      reserved: usage.reserved - reservation.cost,
      reservations: { ...usage.reservations, [key]: { ...reservation, state: "committed" } },
    },
  };
}

export function releaseUsage(usage, key) {
  const reservation = usage.reservations[key];
  if (!reservation) return { ok: false, reason: "unknown", usage };
  if (reservation.state === "released") return { ok: true, duplicate: true, usage };
  if (reservation.state !== "reserved") return { ok: false, reason: reservation.state, usage };
  return {
    ok: true,
    usage: {
      used: usage.used,
      reserved: usage.reserved - reservation.cost,
      reservations: { ...usage.reservations, [key]: { ...reservation, state: "released" } },
    },
  };
}

export function withinProviderBudget(spentCents, capCents) {
  if (capCents == null) return { ok: true, unconfigured: true };
  return { ok: spentCents <= capCents, unconfigured: false };
}

export function catalogReadyToCharge(catalog) {
  if (catalog.billingProvider.activated !== true) return { ok: false, reason: "not-activated" };
  if (catalog.policies.globalMonthlyBudgetCents == null) return { ok: false, reason: "budget" };
  const published = catalog.plans.every((plan) => plan.prices.some((price) => price.priceStatus === "published"));
  if (!published) return { ok: false, reason: "prices-still-study" };
  return { ok: true };
}

export function progressAfterPlanChange(events) {
  return events;
}
