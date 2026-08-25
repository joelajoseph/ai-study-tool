import type { MaterialWithText } from "@/lib/chat";
import { MAX_TEXT_LENGTH } from "@/lib/constants";

export type ChatPromptInput = {
  planLabel: string;
  assessmentType: "quiz" | "exam";
  examDate: string;
  overview: string;
  topics: Array<{ title: string; priority: number }>;
  materials: MaterialWithText[];
};

// Builds the standing instruction ("system prompt") that grounds every chat
// answer in this plan's materials and topic list. Kept separate from llm.ts so
// wording can be iterated without touching request plumbing.
export function buildChatSystemPrompt(input: ChatPromptInput): string {
  const topicList = input.topics.map((topic) => `${topic.priority}. ${topic.title}`).join("\n");
  // Image uploads store no text (raw files aren't kept yet), so a plan can
  // legitimately have no readable material at all — say so instead of
  // letting the model improvise around an empty block.
  const materialBlock =
    input.materials.map((material) => `--- ${material.title} ---\n${material.text}`).join("\n\n").slice(0, MAX_TEXT_LENGTH) ||
    "(No readable material text was stored for this plan.)";

  return `You are the study companion inside a personal study-planning app. The learner is asking questions about ONE specific plan and the course materials behind it.

Plan: ${input.planLabel} (${input.assessmentType}), assessment date ${input.examDate}.
Plan overview: ${input.overview}

Planned topics, in priority order:
${topicList || "(No topics were planned.)"}

Course materials (extracted text from the learner's uploads):
${materialBlock}

Rules:
- Answer ONLY from these materials and the plan above. If something isn't covered there, say so plainly — never invent course content — and point to the closest thing that IS covered.
- When you draw on a source, name it the way it appears above (file name or "pasted course materials"), citing sections/pages/questions when the material makes that possible.
- Be concise and concrete: short paragraphs, bullet lists when enumerating, plain-text formulas. Match the depth of the question rather than dumping everything you know.
- You may suggest which planned topic or material to revisit next when it helps.
- Reply in ordinary prose. Never return JSON or markdown code fences.`;
}
