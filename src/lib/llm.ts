import "server-only";

import { buildStudyPlanPrompt } from "@/lib/prompts/study-plan";

export type ImagePart = { mimeType: string; data: string; name: string };
export type StudyTopic = { title: string; priority: number; estimatedMinutes: number; rationale: string; suggestedDay: number };
export type StudyPlan = { overview: string; daysRemaining: number; topics: StudyTopic[] };

function parsePlan(raw: string, daysRemaining: number): StudyPlan {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("The response was not an object.");
    const value = parsed as { overview?: unknown; topics?: unknown };
    if (typeof value.overview !== "string" || !Array.isArray(value.topics) || value.topics.length === 0) throw new Error("The response did not contain a plan.");

    const topics = value.topics.map((topic, index) => {
      const item = topic as Record<string, unknown>;
      if (typeof item.title !== "string" || typeof item.rationale !== "string") throw new Error("A topic is missing required text.");
      return {
        title: item.title,
        rationale: item.rationale,
        priority: Number.isInteger(item.priority) && (item.priority as number) > 0 ? item.priority as number : index + 1,
        estimatedMinutes: Number.isInteger(item.estimatedMinutes) && (item.estimatedMinutes as number) > 0 ? item.estimatedMinutes as number : 60,
        suggestedDay: Number.isInteger(item.suggestedDay) ? Math.min(Math.max(item.suggestedDay as number, 1), Math.max(daysRemaining, 1)) : 1,
      };
    });
    return { overview: value.overview, daysRemaining, topics: topics.sort((a, b) => a.priority - b.priority) };
  } catch {
    throw new Error("The AI returned a plan in an unexpected format. Please try again.");
  }
}

export async function generateStudyPlan(input: { examDate: string; assessmentType: "quiz" | "exam"; daysRemaining: number; priorKnowledge: string; topics: string; courseMaterials: string; images: ImagePart[] }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Add GEMINI_API_KEY to .env.local before generating a plan.");

  const model = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
  const prompt = buildStudyPlanPrompt(input);
  const parts = [
    { text: prompt },
    ...input.images.map((image) => ({ inlineData: { mimeType: image.mimeType, data: image.data } })),
  ];
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json", temperature: 0.3 } }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("Gemini request failed:", details);
    throw new Error("Gemini could not generate a plan. Check your API key and try again.");
  }
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const rawPlan = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
  if (!rawPlan) throw new Error("Gemini returned an empty plan. Please try again.");
  return parsePlan(rawPlan, input.daysRemaining);
}
