// Shared chat types and pure helpers. Deliberately free of database/network
// imports so the logic is unit-testable, mirroring study-plan.ts for plans.

export type ChatRole = "user" | "assistant";
export type ChatMessage = { id: number; role: ChatRole; content: string; createdAt: string };

// A turn as the LLM module consumes it (id/timestamps are irrelevant there).
export type ChatTurn = { role: ChatRole; content: string };

// One material's extracted text, as needed to ground chat answers.
export type MaterialWithText = { title: string; text: string };

// Shape of one public.chat_messages row as Supabase returns it (snake_case).
export type ChatMessageRow = { id: number; role: string; content: string; created_at: string };

// Converts a database row into the app's camelCase message shape. Returns
// null for rows with an unexpected role so one bad row can't break loading
// the whole conversation.
export function mapChatMessage(row: ChatMessageRow): ChatMessage | null {
  if (row.role !== "user" && row.role !== "assistant") return null;
  return { id: row.id, role: row.role, content: row.content, createdAt: row.created_at };
}

export function mapChatMessageRows(rows: ChatMessageRow[]): ChatMessage[] {
  return rows.map(mapChatMessage).filter((message): message is ChatMessage => message !== null);
}

// Keeps the most recent messages that fit both budgets, returned in
// chronological order. Walking newest-to-oldest means old turns are dropped
// first, and the newest turn always survives even if it alone exceeds the
// character budget (so the trim can never produce an empty context).
export function trimChatHistory(messages: ChatMessage[], limits: { maxCount: number; maxChars: number }): ChatMessage[] {
  const kept: ChatMessage[] = [];
  let totalChars = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (kept.length >= limits.maxCount) break;
    if (kept.length > 0 && totalChars + message.content.length > limits.maxChars) break;
    kept.unshift(message);
    totalChars += message.content.length;
  }
  return kept;
}

// Validates a client-supplied message: must be a string with visible content
// once trimmed, within the length cap. Returns the trimmed value or null.
export function parseChatContent(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}
