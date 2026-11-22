const ALLOWED = ["extracted", "needs-review", "reviewed", "verified-by-execution", "retired"];

export function reviewStatusAllowed(generator, status) {
  if (generator === "claude" || generator === "script") {
    return status === "extracted" || status === "needs-review";
  }
  return ALLOWED.includes(status);
}
