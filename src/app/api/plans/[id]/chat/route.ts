import { ApiError, toErrorResponse } from "@/lib/api-error";
import { parseChatContent, trimChatHistory } from "@/lib/chat";
import { CHAT_HISTORY_MAX_CHARS, CHAT_HISTORY_MAX_MESSAGES, MAX_CHAT_MESSAGE_LENGTH } from "@/lib/constants";
import { generateChatReply } from "@/lib/llm";
import { buildChatSystemPrompt } from "@/lib/prompts/chat";
import { clearChatMessages, loadChatMessages, loadMaterialsText, loadPlan, saveChatExchange } from "@/lib/persistence";
import { isSupabaseConfigured } from "@/lib/supabase";
import { planDisplayLabel } from "@/lib/study-plan";

export const runtime = "nodejs";
// Gemini calls with large material context can outlast the default limit.
export const maxDuration = 60;

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError("Invalid plan id.");
  return id;
}

// Confirms the plan exists (404 otherwise) and returns its context, which the
// prompt builder needs: label, dates, overview, and topic titles.
async function loadContext(id: number) {
  const loaded = await loadPlan(id);
  if (!loaded) throw new ApiError("That plan doesn't exist (it may have been deleted).", 404);
  return loaded;
}

// Full conversation history for this plan.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseConfigured()) throw new ApiError("Chat requires Supabase, which isn't configured.");
    const loaded = await loadContext(parseId((await params).id));
    return Response.json({ messages: await loadChatMessages(loaded.plan.id, CHAT_HISTORY_MAX_MESSAGES) });
  } catch (error) {
    console.error("Loading chat failed:", error);
    return toErrorResponse(error, "Couldn't load the conversation.");
  }
}

// Ask one question. Nothing is written until Gemini answers successfully —
// then both rows are saved together, so a failed LLM call never leaves an
// orphan question behind.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseConfigured()) throw new ApiError("Chat requires Supabase, which isn't configured.");
    const planId = parseId((await params).id);
    const body = (await request.json().catch(() => null)) as { content?: unknown } | null;
    const content = parseChatContent(body?.content, MAX_CHAT_MESSAGE_LENGTH);
    if (content === null) {
      throw new ApiError(`Write a question first (up to ${MAX_CHAT_MESSAGE_LENGTH.toLocaleString()} characters).`);
    }

    const loaded = await loadContext(planId);
    const [materials, history] = await Promise.all([loadMaterialsText(planId), loadChatMessages(planId, CHAT_HISTORY_MAX_MESSAGES)]);

    const reply = await generateChatReply({
      systemPrompt: buildChatSystemPrompt({
        planLabel: planDisplayLabel(loaded.plan),
        assessmentType: loaded.plan.assessmentType,
        examDate: loaded.plan.examDate,
        overview: loaded.plan.overview,
        topics: loaded.plan.topics.map((topic) => ({ title: topic.title, priority: topic.priority })),
        materials,
      }),
      // The new question is passed separately; history is everything before it.
      history: trimChatHistory(history, { maxCount: CHAT_HISTORY_MAX_MESSAGES, maxChars: CHAT_HISTORY_MAX_CHARS }),
      message: content,
    });

    const [userMessage, assistantMessage] = await saveChatExchange(planId, content, reply);
    return Response.json({ userMessage, assistantMessage });
  } catch (error) {
    console.error("Chat failed:", error);
    return toErrorResponse(error, "Couldn't get an answer. Please try again.");
  }
}

// Clears this plan's conversation ("start fresh" button).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseConfigured()) throw new ApiError("Chat requires Supabase, which isn't configured.");
    await clearChatMessages(parseId((await params).id));
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Clearing chat failed:", error);
    return toErrorResponse(error, "Couldn't clear the conversation.");
  }
}
