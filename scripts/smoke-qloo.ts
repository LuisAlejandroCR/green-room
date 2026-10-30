// smoke-qloo.ts: `npm run smoke:qloo`. Needs QLOO_API_KEY in the local environment (never passed on the command line).
// Prints structure only: no key, no response bodies, nothing written to disk.
import { formatReport, runSmoke } from "../lib/smoke.ts";

const key = process.env.QLOO_API_KEY;
if (!key) {
  console.log("blocked: missing QLOO_API_KEY");
  process.exit(2);
}
const baseUrl = process.env.QLOO_BASE_URL ?? "https://hackathon.api.qloo.com";
const checks = await runSmoke({ key, baseUrl, work: process.env.SMOKE_WORK });
console.log(`base: ${baseUrl}\n`);
console.log(formatReport(checks, [key]));
process.exit(checks.some((c) => c.outcome === "fail") ? 1 : 0);
