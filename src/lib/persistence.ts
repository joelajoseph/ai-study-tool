import "server-only";

import { requireSupabase } from "@/lib/supabase";
import type { MaterialSummary, StoredPlan, StudyPlan } from "@/lib/study-plan";

// One parsed upload, as stored in the materials table. Images have no
// extracted text — their content column stays null until raw files move to
// Supabase Storage (a deliberate Phase 2 simplification).
export type ParsedUpload = { title: string; sourceType: "pdf" | "image" | "text"; text: string | null };

export async function saveGeneratedPlan(input: {
  examDate: string;
  assessmentType: "quiz" | "exam";
  daysRemaining: number;
  priorKnowledge: string;
  topicsText: string;
  pastedMaterials: string;
  uploads: ParsedUpload[];
  plan: StudyPlan;
}): Promise<StoredPlan> {
  const supabase = requireSupabase();

  const materialRows = [
    ...(input.pastedMaterials.trim() ? [{ title: "Pasted course materials", source_type: "text", extracted_text: input.pastedMaterials.trim() }] : []),
    ...input.uploads.map((upload) => ({ title: upload.title, source_type: upload.sourceType, extracted_text: upload.text })),
  ];
  if (materialRows.length > 0) {
    const { error } = await supabase.from("materials").insert(materialRows);
    if (error) throw new Error(`Saving materials failed: ${error.message}`);
  }

  const { data: planRow, error: planError } = await supabase
    .from("plans")
    .insert({
      exam_date: input.examDate,
      assessment_type: input.assessmentType,
      days_remaining_at_creation: input.daysRemaining,
      overview: input.plan.overview,
      topics_text: input.topicsText,
      prior_knowledge: input.priorKnowledge,
    })
    .select("id")
    .single();
  if (planError) throw new Error(`Saving plan failed: ${planError.message}`);

  const topicRows = input.plan.topics.map((topic) => ({
    plan_id: planRow.id,
    title: topic.title,
    priority_order: topic.priority,
    estimated_minutes: topic.estimatedMinutes,
    rationale: topic.rationale,
    suggested_day: topic.suggestedDay,
    materials: topic.materials,
  }));
  const { error: topicsError } = await supabase.from("plan_topics").insert(topicRows);
  if (topicsError) throw new Error(`Saving topics failed: ${topicsError.message}`);

  // Reading back through loadLatestPlan keeps one code path for row → type
  // mapping and guarantees the returned plan matches what GET would return.
  const stored = await loadLatestPlan();
  if (!stored) throw new Error("Plan was saved but could not be read back.");
  return stored;
}

export async function loadLatestPlan(): Promise<StoredPlan | null> {
  const supabase = requireSupabase();
  const { data: planRow, error } = await supabase
    .from("plans")
    .select("id, exam_date, assessment_type, days_remaining_at_creation, overview, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Loading plan failed: ${error.message}`);
  if (!planRow) return null;

  const { data: topicRows, error: topicsError } = await supabase
    .from("plan_topics")
    .select("id, title, priority_order, estimated_minutes, rationale, suggested_day, materials, completed")
    .eq("plan_id", planRow.id)
    .order("suggested_day")
    .order("priority_order");
  if (topicsError) throw new Error(`Loading topics failed: ${topicsError.message}`);

  return {
    id: planRow.id,
    examDate: planRow.exam_date,
    assessmentType: planRow.assessment_type === "quiz" ? "quiz" : "exam",
    createdAt: planRow.created_at,
    overview: planRow.overview,
    daysRemaining: planRow.days_remaining_at_creation,
    topics: (topicRows ?? []).map((row) => ({
      id: row.id,
      completed: row.completed,
      title: row.title,
      rationale: row.rationale,
      priority: row.priority_order,
      estimatedMinutes: row.estimated_minutes,
      suggestedDay: row.suggested_day,
      materials: Array.isArray(row.materials) ? row.materials.filter((entry): entry is string => typeof entry === "string") : [],
    })),
  };
}

export async function listMaterials(limit = 50): Promise<MaterialSummary[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("materials")
    .select("id, title, source_type, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Loading materials failed: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    sourceType: row.source_type === "pdf" ? "pdf" : row.source_type === "image" ? "image" : "text",
    createdAt: row.created_at,
  }));
}
