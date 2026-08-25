import { ApiError, toErrorResponse } from "@/lib/api-error";
import { listPlans, savePlan } from "@/lib/persistence";
import type { PlanDraft, StudyPlan } from "@/lib/study-plan";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

// The saved-plan library. Drafts never appear here because they never reach
// the database.
export async function GET() {
  if (!isSupabaseConfigured()) {
    return Response.json({ plans: [], persistenceEnabled: false });
  }
  try {
    return Response.json({ plans: await listPlans(), persistenceEnabled: true });
  } catch (error) {
    console.error("Listing plans failed:", error);
    return toErrorResponse(error, "Couldn't load your saved plans.");
  }
}

// Explicit save: writes a generated draft (plan + its inputs/uploads) to the
// database for the first time.
export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      throw new ApiError("Saving plans requires Supabase. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local and restart.");
    }
    const body = (await request.json()) as { title?: unknown; plan?: unknown; draft?: unknown };
    if (!body.plan || typeof body.plan !== "object" || !body.draft || typeof body.draft !== "object") {
      throw new ApiError("The save request was missing the plan or its context.");
    }
    const plan = body.plan as StudyPlan;
    const draft = body.draft as PlanDraft;
    if (typeof plan.overview !== "string" || !Array.isArray(plan.topics) || plan.topics.length === 0) {
      throw new ApiError("The plan payload was incomplete.");
    }
    if (
      draft.assessmentType !== "quiz" && draft.assessmentType !== "exam" ||
      typeof draft.examDate !== "string" || !draft.examDate ||
      typeof draft.priorKnowledge !== "string" ||
      typeof draft.topicsText !== "string" ||
      typeof draft.pastedMaterials !== "string" ||
      !Array.isArray(draft.uploads)
    ) {
      throw new ApiError("The plan context was incomplete.");
    }
    const title = typeof body.title === "string" ? body.title : "";

    // savePlan reads the plan back, so the response matches GET /api/plans/[id].
    return Response.json(await savePlan({ title, draft, plan }));
  } catch (error) {
    console.error("Saving plan failed:", error);
    return toErrorResponse(error, "Unable to save the plan.");
  }
}
