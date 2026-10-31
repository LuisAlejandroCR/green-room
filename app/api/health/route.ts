// route.ts (/api/health): deploy check. Reports which server-side integrations are configured, never their values.
import { agentConfigured } from "@/lib/agent";
import { currentMode } from "@/lib/qloo";
import { tourPresent } from "@/lib/tour";

export function GET() {
  return Response.json({
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
    mode: currentMode(),
    key_present: Boolean(process.env.QLOO_API_KEY),
    jev_key_present: Boolean(process.env.JEV_API_KEY),
    agent_key_present: agentConfigured(),
    tour_present: tourPresent(),
  });
}
