export type StudyPlanPromptInput = {
  examDate: string;
  assessmentType: "quiz" | "exam";
  daysRemaining: number;
  priorKnowledge: string;
  topics: string;
  courseMaterials: string;
};

export function buildStudyPlanPrompt(input: StudyPlanPromptInput) {
  return `You are a thoughtful study-planning assistant. Build a realistic, focused plan based only on the supplied materials and learner context.

Assessment type: ${input.assessmentType}
Assessment date: ${input.examDate}
Days remaining: ${input.daysRemaining}
Learner context: ${input.priorKnowledge || "No additional context was supplied."}

Requested topics, chapters, or learning objectives:
${input.topics || "No specific topics were listed; infer coverage from the course study materials."}

Course study materials (pasted text and extracted uploads):
${input.courseMaterials}

Return ONLY valid JSON. Do not include markdown, a code fence, or explanatory text. Use exactly this shape:
{
  "overview": "A short, encouraging 1–2 sentence summary.",
  "topics": [
    {
      "title": "Specific topic from the supplied material",
      "priority": 1,
      "estimatedMinutes": 90,
      "rationale": "Why this deserves this priority, including the learner context when useful.",
      "suggestedDay": 1
    }
  ]
}

Rules: provide 3–8 concrete topics when the inputs support it; priority 1 is most important; use positive integer minutes; suggestedDay must be between 1 and ${Math.max(input.daysRemaining, 1)}; treat the requested topics as the intended coverage and use course study materials for evidence and detail. Do not invent course content not found in either input.

Planning approach: if assessment type is quiz, favor shorter, targeted sessions focused on key concepts, quick practice drills, and the tight time horizon. If assessment type is exam, create a comprehensive plan that covers the breadth of requested topics, uses mixed-topic review, and includes practice exams or mock tests when the supplied materials make them appropriate.`;
}
