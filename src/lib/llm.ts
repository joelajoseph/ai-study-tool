import "server-only";

import { ApiError } from "@/lib/api-error";
import type { ChatTurn } from "@/lib/chat";
import { buildRegenerateStudyPlanPrompt, buildStudyPlanPrompt, type RegeneratePlanPromptInput } from "@/lib/prompts/study-plan";
import { parsePlan, type StudyPlan } from "@/lib/study-plan";

export type ImagePart = { mimeType: string; data: string; name: string };

const REQUEST_TIMEOUT_MS = 60_000;
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Only the slice of Gemini's reply shape this app actually reads.
type GenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export async function generateStudyPlan(input: {
  examDate: string;
  assessmentType: "quiz" | "exam";
  daysRemaining: number;
  priorKnowledge: string;
  topics: string;
  courseMaterials: string;
  images: ImagePart[];
}): Promise<StudyPlan> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ApiError("Add GEMINI_API_KEY to .env.local before generating a plan.", 500);

  const model = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
  const parts = [
    { text: buildStudyPlanPrompt(input) },
    ...input.images.map((image) => ({ inlineData: { mimeType: image.mimeType, data: image.data } })),
  ];

  // The key travels in a header rather than a query parameter so it can't leak
  // into server/proxy logs. AbortSignal.timeout fails fast if Gemini hangs
  // instead of leaving the browser waiting forever.
  let response: Response;
  try {
    response = await fetch(`${GEMINI_BASE_URL}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError("Couldn't reach Gemini (network error or timeout). Please try again.", 504);
  }

  if (!response.ok) {
    const details = await response.text();
    console.error("Gemini request failed:", response.status, details);
    if (response.status === 401 || response.status === 403) {
      throw new ApiError("Gemini rejected your API key. Double-check GEMINI_API_KEY in .env.local.", 500);
    }
    if (response.status === 429) {
      throw new ApiError("You've hit Gemini's free-tier rate limit. Wait a minute and try again.", 429);
    }
    throw new ApiError("Gemini couldn't generate a plan right now. Please try again.", 502);
  }

  let data: GenerateContentResponse;
  try {
    data = await response.json();
  } catch {
    throw new ApiError("Gemini returned an unreadable response. Please try again.", 502);
  }

  const rawPlan = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
  if (!rawPlan) throw new ApiError("Gemini returned an empty plan. Please try again.", 502);
  return parsePlan(rawPlan, input.daysRemaining);
}

export async function regenerateStudyPlan(input: RegeneratePlanPromptInput): Promise<StudyPlan> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ApiError("Add GEMINI_API_KEY to .env.local before regenerating a plan.", 500);

  const model = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
  const prompt = buildRegenerateStudyPlanPrompt(input);

  let response: Response;
  try {
    response = await fetch(`${GEMINI_BASE_URL}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError("Couldn't reach Gemini (network error or timeout). Please try again.", 504);
  }

  if (!response.ok) {
    const details = await response.text();
    console.error("Gemini request failed:", response.status, details);
    if (response.status === 401 || response.status === 403) {
      throw new ApiError("Gemini rejected your API key. Double-check GEMINI_API_KEY in .env.local.", 500);
    }
    if (response.status === 429) {
      throw new ApiError("You've hit Gemini's free-tier rate limit. Wait a minute and try again.", 429);
    }
    throw new ApiError("Gemini couldn't regenerate the plan right now. Please try again.", 502);
  }

  let data: GenerateContentResponse;
  try {
    data = await response.json();
  } catch {
    throw new ApiError("Gemini returned an unreadable response. Please try again.", 502);
  }

  const rawPlan = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
  if (!rawPlan) throw new ApiError("Gemini returned an empty plan. Please try again.", 502);
  return parsePlan(rawPlan, input.daysRemaining);
}

// Maps stored history turns to Gemini's multi-turn "contents" shape. Gemini
// calls the assistant side "model", so roles are translated here — the rest
// of the app can keep saying user/assistant.
function toGeminiContents(history: ChatTurn[], message: string) {
  return [
    ...history.map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];
}

// One chat turn. The grounding context (materials, plan, rules) travels in
// systemPrompt as Gemini's dedicated systemInstruction, keeping it out of the
// visible transcript; history is the prior (trimmed) conversation.
export async function generateChatReply(input: {
  systemPrompt: string;
  history: ChatTurn[];
  message: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ApiError("Add GEMINI_API_KEY to .env.local before chatting about your materials.", 500);

  const model = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
  let response: Response;
  try {
    response = await fetch(`${GEMINI_BASE_URL}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: toGeminiContents(input.history, input.message),
        systemInstruction: { parts: [{ text: input.systemPrompt }] },
        // Slightly warmer than plan generation: prose answers benefit from a
        // little variety, but grounding still matters more than creativity.
        generationConfig: { temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError("Couldn't reach Gemini (network error or timeout). Please try again.", 504);
  }

  if (!response.ok) {
    const details = await response.text();
    console.error("Gemini request failed:", response.status, details);
    if (response.status === 401 || response.status === 403) {
      throw new ApiError("Gemini rejected your API key. Double-check GEMINI_API_KEY in .env.local.", 500);
    }
    if (response.status === 429) {
      throw new ApiError("You've hit Gemini's free-tier rate limit. Wait a minute and try again.", 429);
    }
    throw new ApiError("Gemini couldn't answer right now. Please try again.", 502);
  }

  let data: GenerateContentResponse;
  try {
    data = await response.json();
  } catch {
    throw new ApiError("Gemini returned an unreadable response. Please try again.", 502);
  }

  // Chat answers are plain prose — no JSON parsing or fence-stripping needed,
  // unlike the structured study-plan response.
  const reply = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
  if (!reply) throw new ApiError("Gemini returned an empty answer. Please try again.", 502);
  return reply;
}
