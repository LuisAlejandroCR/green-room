// route.ts (/api/tour): the labelled RECORDED tour, from the private GREEN_ROOM_TOUR variable. Spends no Qloo request.
// In development only, `?record=1` runs the demo brief live once and returns the value to store privately
// (for example `vercel env add GREEN_ROOM_TOUR`). Nothing is written to disk or to the repo.
import { DEMO_BRIEF } from "@/lib/demo";
import { limitRequest } from "@/lib/guard";
import { executeRun } from "@/lib/run";
import { encodeTour, readTour } from "@/lib/tour";

export async function GET(req: Request) {
  const record = new URL(req.url).searchParams.get("record") === "1";
  if (record) {
    if (process.env.NODE_ENV !== "development") return Response.json({ error: "not_found" }, { status: 404 });
    const limited = limitRequest(req, "run");
    if (limited) return limited;
    const run = await executeRun(DEMO_BRIEF);
    if (run.state !== "ok" || run.mode !== "live") return Response.json({ error: "live_run_failed", state: run.state }, { status: 502 });
    return Response.json({ variable: "GREEN_ROOM_TOUR", value: encodeTour(run) });
  }
  const limited = limitRequest(req, "tour");
  if (limited) return limited;
  const tour = readTour();
  return tour ? Response.json({ ...tour.run, recordedAt: tour.recordedAt }) : Response.json({ error: "tour_unavailable" }, { status: 404 });
}
