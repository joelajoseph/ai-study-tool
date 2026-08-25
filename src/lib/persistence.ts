import "server-only";

import { requireSupabase } from "@/lib/supabase";
import type { LoadedPlan, PlanDraft, PlanSummary, StudyPlan } from "@/lib/study-plan";

// Writes a generated draft to the database for the first time: the plan row,
// its topics, and the materials that came with the generation. Materials are
// linked to the plan so deleting the plan cleans them up automatically.
export async function savePlan(input: { title: string; draft: PlanDraft; plan: StudyPlan }): Promise<LoadedPlan> {
  const supabase = requireSupabase();

  const { data: planRow, error: planError } = await supabase
    .from("plans")
    .insert({
      title: input.title.trim() || null,
      exam_date: input.draft.examDate,
      assessment_type: input.draft.assessmentType,
      days_remaining_at_creation: input.draft.daysRemaining,
      overview: input.plan.overview,
      topics_text: input.draft.topicsText,
      prior_knowledge: input.draft.priorKnowledge,
    })
    .select("id")
    .single();
  if (planError) throw new Error(`Saving plan failed: ${planError.message}`);
  const planId = planRow.id;

  try {
    const topicRows = input.plan.topics.map((topic) => ({
      plan_id: planId,
      title: topic.title,
      priority_order: topic.priority,
      estimated_minutes: topic.estimatedMinutes,
      rationale: topic.rationale,
      suggested_day: topic.suggestedDay,
      materials: topic.materials,
    }));
    const { error: topicsError } = await supabase.from("plan_topics").insert(topicRows);
    if (topicsError) throw new Error(`Saving topics failed: ${topicsError.message}`);

    const materialRows = [
      ...(input.draft.pastedMaterials.trim()
        ? [{ plan_id: planId, title: "Pasted course materials", source_type: "text", extracted_text: input.draft.pastedMaterials.trim() }]
        : []),
      ...input.draft.uploads.map((upload) => ({ plan_id: planId, title: upload.title, source_type: upload.sourceType, extracted_text: upload.text })),
    ];
    if (materialRows.length > 0) {
      const { error: materialsError } = await supabase.from("materials").insert(materialRows);
      if (materialsError) throw new Error(`Saving materials failed: ${materialsError.message}`);
    }
  } catch (error) {
    // Don't leave a half-written plan (with no topics) behind.
    await supabase.from("plans").delete().eq("id", planId);
    throw error;
  }

  // Reading back through loadPlan keeps one code path for row → type mapping
  // and guarantees the response matches what GET /api/plans/[id] would return.
  const loaded = await loadPlan(planId);
  if (!loaded) throw new Error("Plan was saved but could not be read back.");
  return loaded;
}

export async function listPlans(): Promise<PlanSummary[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("plans")
    .select("id, title, exam_date, assessment_type, days_remaining_at_creation, created_at, plan_topics(count)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Loading plans failed: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    examDate: row.exam_date,
    assessmentType: row.assessment_type === "quiz" ? "quiz" : "exam",
    daysRemaining: row.days_remaining_at_creation,
    createdAt: row.created_at,
    topicCount: Array.isArray(row.plan_topics) && row.plan_topics[0]?.count != null ? Number(row.plan_topics[0].count) : 0,
  }));
}

export async function loadPlan(id: number): Promise<LoadedPlan | null> {
  const supabase = requireSupabase();
  const { data: planRow, error } = await supabase
    .from("plans")
    .select("id, title, exam_date, assessment_type, days_remaining_at_creation, overview, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Loading plan failed: ${error.message}`);
  if (!planRow) return null;

  const [topicsResult, materialsResult] = await Promise.all([
    supabase
      .from("plan_topics")
      .select("id, title, priority_order, estimated_minutes, rationale, suggested_day, materials, completed")
      .eq("plan_id", id)
      .order("suggested_day")
      .order("priority_order"),
    supabase.from("materials").select("id, title, source_type, created_at").eq("plan_id", id).order("created_at"),
  ]);
  if (topicsResult.error) throw new Error(`Loading topics failed: ${topicsResult.error.message}`);
  if (materialsResult.error) throw new Error(`Loading materials failed: ${materialsResult.error.message}`);

  return {
    plan: {
      id: planRow.id,
      title: planRow.title,
      examDate: planRow.exam_date,
      assessmentType: planRow.assessment_type === "quiz" ? "quiz" : "exam",
      createdAt: planRow.created_at,
      overview: planRow.overview,
      daysRemaining: planRow.days_remaining_at_creation,
      topics: (topicsResult.data ?? []).map((row) => ({
        id: row.id,
        completed: row.completed,
        title: row.title,
        rationale: row.rationale,
        priority: row.priority_order,
        estimatedMinutes: row.estimated_minutes,
        suggestedDay: row.suggested_day,
        materials: Array.isArray(row.materials) ? row.materials.filter((entry): entry is string => typeof entry === "string") : [],
      })),
    },
    materials: (materialsResult.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      sourceType: row.source_type === "pdf" ? "pdf" : row.source_type === "image" ? "image" : "text",
      createdAt: row.created_at,
    })),
  };
}

export async function deletePlan(id: number): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) throw new Error(`Deleting plan failed: ${error.message}`);
}

// Sets a plan's title (blank becomes null, which displays as the generated
// label). Works for renaming titled plans too.
export async function renamePlan(id: number, title: string): Promise<LoadedPlan> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("plans").update({ title: title.trim() || null }).eq("id", id);
  if (error) throw new Error(`Renaming plan failed: ${error.message}`);
  const loaded = await loadPlan(id);
  if (!loaded) throw new Error("Plan not found after rename.");
  return loaded;
}
