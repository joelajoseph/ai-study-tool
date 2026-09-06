import { ApiError, toErrorResponse } from "@/lib/api-error";
import { regenerateStudyPlan } from "@/lib/llm";
import { loadMaterialsText, loadPlan, updatePlanSchedule } from "@/lib/persistence";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError("Invalid plan id.");
  return id;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseConfigured()) throw new ApiError("Regenerating a plan requires Supabase, which isn't configured.");
    const planId = parseId((await params).id);
    const body = (await request.json().catch(() => null)) as {
      examDate?: unknown;
      daysRemaining?: unknown;
      progressNotes?: unknown;
      apply?: unknown;
    } | null;

    const loaded = await loadPlan(planId);
    if (!loaded) throw new ApiError("That plan doesn't exist (it may have been deleted).", 404);

    const examDate = typeof body?.examDate === "string" && body.examDate.trim() ? body.examDate.trim() : loaded.plan.examDate;
    const exam = new Date(`${examDate}T00:00:00`);
    const defaultDaysRemaining = Math.max(1, Math.ceil((exam.valueOf() - Date.now()) / 86_400_000));
    const daysRemaining = typeof body?.daysRemaining === "number" && body.daysRemaining > 0 ? body.daysRemaining : defaultDaysRemaining;

    const progressNotes = typeof body?.progressNotes === "string" ? body.progressNotes.trim() : "";
    const shouldApply = body?.apply === true;

    const materials = await loadMaterialsText(planId);
    const courseMaterials = materials.map((m) => `--- ${m.title} ---\n${m.text}`).join("\n\n") || "No detailed text available.";

    const completedTopics = loaded.plan.topics.filter((topic) => topic.completed).map((topic) => topic.title);
    const remainingTopics = loaded.plan.topics.filter((topic) => !topic.completed).map((topic) => topic.title);

    const regenerated = await regenerateStudyPlan({
      examDate,
      assessmentType: loaded.plan.assessmentType,
      daysRemaining,
      priorKnowledge: loaded.plan.priorKnowledge ?? "",
      originalTopics: loaded.plan.topicsText ?? "",
      courseMaterials,
      completedTopics,
      remainingTopics,
      progressNotes,
    });

    if (shouldApply) {
      const updatedPlan = await updatePlanSchedule({
        planId,
        overview: regenerated.overview,
        daysRemaining,
        examDate,
        newTopics: regenerated.topics,
        retainCompleted: true,
      });
      return Response.json(updatedPlan);
    }

    return Response.json({ previewPlan: regenerated, daysRemaining, examDate });
  } catch (error) {
    console.error("Plan regeneration failed:", error);
    return toErrorResponse(error, "Unable to regenerate study plan.");
  }
}
