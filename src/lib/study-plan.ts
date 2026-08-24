export type StudyTopic = { title: string; priority: number; estimatedMinutes: number; rationale: string; suggestedDay: number; materials: string[] };
export type StudyPlan = { overview: string; daysRemaining: number; topics: StudyTopic[] };

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
