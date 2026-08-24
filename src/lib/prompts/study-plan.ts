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
      "suggestedDay": 1,
      "materials": ["Lecture slides — sections 4.2 to 4.4", "Tutorial worksheet Q1–Q6", "Problem set Q1–Q3"]
    }
  ]
}

Rules:
- Provide 3–8 concrete topics when the inputs support it.
- "priority" is a strict ranking with no ties: unique integers 1, 2, 3, … where 1 means study first.
- "estimatedMinutes" must be a positive integer.
- "suggestedDay" must be an integer between 1 and ${Math.max(input.daysRemaining, 1)}. Schedule topics in priority order, so the most important topics land on the earliest days. Several short topics may share a day as long as the day's total stays under about 4 hours.
- "materials" must list the specific supplied materials to use for that topic, in the exact order the learner should work through them. Name each material the way the learner named it (for uploads, use the file name). When a material allows it, point to concrete sections, page ranges, slide numbers, or question numbers. Never invent materials that were not supplied.
- Treat the requested topics as the intended coverage and use course study materials for evidence and detail. Do not invent course content not found in either input.

Planning approach: if assessment type is quiz, favor shorter, targeted sessions focused on key concepts, quick practice drills, and the tight time horizon. If assessment type is exam, create a comprehensive plan that covers the breadth of requested topics, uses mixed-topic review, and includes practice exams or mock tests when the supplied materials make them appropriate.`;
}
