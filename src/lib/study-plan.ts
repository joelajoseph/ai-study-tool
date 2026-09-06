export type ParsedUpload = { title: string; sourceType: "pdf" | "image" | "text"; text: string | null };
export type StudyTopic = {
  id?: number;
  title: string;
  priority: number;
  estimatedMinutes: number;
  rationale: string;
  suggestedDay: number;
  materials: string[];
  completed?: boolean;
};
export type StudyPlan = { title?: string | null; overview: string; daysRemaining: number; topics: StudyTopic[]; assessmentType?: "quiz" | "exam" };

// Everything needed to write a generated plan to the database later. It lives
// in client state while the plan is an unsaved draft — the database is only
// written when the user explicitly saves.
export type PlanDraft = {
  examDate: string;
  assessmentType: "quiz" | "exam";
  daysRemaining: number;
  priorKnowledge: string;
  topicsText: string;
  pastedMaterials: string;
  uploads: ParsedUpload[];
};

// Shapes returned once a plan has been persisted. A StoredPlan is a superset
// of StudyPlan, so the same UI renders drafts and saved plans.
export type PlanTopicRow = StudyTopic & { id: number; completed: boolean };
export type StoredPlan = {
  id: number;
  title: string | null;
  examDate: string;
  assessmentType: "quiz" | "exam";
  createdAt: string;
  overview: string;
  daysRemaining: number;
  topicsText?: string | null;
  priorKnowledge?: string | null;
  topics: PlanTopicRow[];
};
export type MaterialSummary = { id: number; title: string; sourceType: "pdf" | "image" | "text"; createdAt: string };
export type LoadedPlan = { plan: StoredPlan; materials: MaterialSummary[] };
export type PlanSummary = {
  id: number;
  title: string | null;
  examDate: string;
  assessmentType: "quiz" | "exam";
  daysRemaining: number;
  createdAt: string;
  topicCount: number;
};

export type PlanProgress = {
  totalTopics: number;
  completedTopics: number;
  percent: number;
  totalMinutes: number;
  completedMinutes: number;
  remainingMinutes: number;
};

export function calculateProgress(topics: Array<{ completed?: boolean; estimatedMinutes: number }>): PlanProgress {
  const totalTopics = topics.length;
  if (totalTopics === 0) {
    return {
      totalTopics: 0,
      completedTopics: 0,
      percent: 0,
      totalMinutes: 0,
      completedMinutes: 0,
      remainingMinutes: 0,
    };
  }

  let completedTopics = 0;
  let totalMinutes = 0;
  let completedMinutes = 0;

  for (const topic of topics) {
    totalMinutes += topic.estimatedMinutes;
    if (topic.completed) {
      completedTopics += 1;
      completedMinutes += topic.estimatedMinutes;
    }
  }

  const percent = Math.round((completedTopics / totalTopics) * 100);
  const remainingMinutes = Math.max(0, totalMinutes - completedMinutes);

  return {
    totalTopics,
    completedTopics,
    percent,
    totalMinutes,
    completedMinutes,
    remainingMinutes,
  };
}

export function defaultPlanTitle(assessmentType: "quiz" | "exam", examDate: string) {
  return `${assessmentType === "quiz" ? "Quiz" : "Exam"} — ${examDate}`;
}

// Untitled plans (title stored as null) display a generated label instead.
export function planDisplayLabel(plan: { title: string | null; assessmentType: "quiz" | "exam"; examDate: string }) {
  return plan.title?.trim() || defaultPlanTitle(plan.assessmentType, plan.examDate);
}

// Validates the model's raw JSON reply into a StudyPlan. Individual fields get
// sensible fallbacks so one malformed value doesn't throw away the whole plan;
// only structural problems (not JSON, no topics) reject the response.
export function parsePlan(raw: string, daysRemaining: number): StudyPlan {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("The response was not an object.");
    const value = parsed as { overview?: unknown; topics?: unknown };
    if (typeof value.overview !== "string" || !Array.isArray(value.topics) || value.topics.length === 0) throw new Error("The response did not contain a plan.");

    const topics = value.topics.map((topic, index) => {
      const item = topic as Record<string, unknown>;
      if (typeof item.title !== "string" || typeof item.rationale !== "string") throw new Error("A topic is missing required text.");
      const materials = Array.isArray(item.materials)
        ? item.materials.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim())
        : [];
      return {
        title: item.title,
        rationale: item.rationale,
        materials,
        priority: Number.isInteger(item.priority) && (item.priority as number) > 0 ? item.priority as number : index + 1,
        estimatedMinutes: Number.isInteger(item.estimatedMinutes) && (item.estimatedMinutes as number) > 0 ? item.estimatedMinutes as number : 60,
        suggestedDay: Number.isInteger(item.suggestedDay) ? Math.min(Math.max(item.suggestedDay as number, 1), Math.max(daysRemaining, 1)) : 1,
      };
    });

    // The model sometimes hands out tied priorities despite the prompt, so
    // re-rank into a strict 1..N sequence (stable sort keeps the model's own
    // ordering among ties). The plan then reads as a schedule: day order
    // first, priority order within a day.
    const ranked = topics
      .sort((a, b) => a.priority - b.priority)
      .map((topic, index) => ({ ...topic, priority: index + 1 }))
      .sort((a, b) => a.suggestedDay - b.suggestedDay || a.priority - b.priority);
    return { overview: value.overview, daysRemaining, topics: ranked };
  } catch {
    throw new Error("The AI returned a plan in an unexpected format. Please try again.");
  }
}
