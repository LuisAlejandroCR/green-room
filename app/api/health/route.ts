import { currentMode } from "@/lib/qloo";

export function GET() {
  return Response.json({
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
    mode: currentMode(),
    key_present: Boolean(process.env.QLOO_API_KEY),
  });
}
