import { describe, expect, it } from "vitest";
import { mapChatMessage, parseChatContent, trimChatHistory, type ChatMessage } from "./chat";

function msg(id: number, role: "user" | "assistant", content: string): ChatMessage {
  return { id, role, content, createdAt: new Date(2026, 0, id).toISOString() };
}

describe("trimChatHistory", () => {
  it("keeps the newest messages within the count limit, oldest first", () => {
    const history = [msg(1, "user", "a"), msg(2, "assistant", "b"), msg(3, "user", "c"), msg(4, "assistant", "d")];
    expect(trimChatHistory(history, { maxCount: 2, maxChars: 1_000 }).map((message) => message.id)).toEqual([3, 4]);
  });

  it("drops older messages first when the character budget binds", () => {
    const history = [msg(1, "user", "x".repeat(50)), msg(2, "assistant", "y".repeat(50)), msg(3, "user", "z".repeat(10))];
    const kept = trimChatHistory(history, { maxCount: 10, maxChars: 60 });
    expect(kept.map((message) => message.id)).toEqual([2, 3]);
  });

  it("always keeps the newest message even when it alone exceeds the budget", () => {
    const history = [msg(1, "user", "long ".repeat(100))];
    expect(trimChatHistory(history, { maxCount: 5, maxChars: 10 })).toHaveLength(1);
  });

  it("returns an empty array for empty history", () => {
    expect(trimChatHistory([], { maxCount: 5, maxChars: 100 })).toEqual([]);
  });
});

describe("mapChatMessage", () => {
  it("maps a database row to the app shape", () => {
    expect(mapChatMessage({ id: 7, role: "assistant", content: "hi", created_at: "2026-01-01T00:00:00Z" })).toEqual({
      id: 7,
      role: "assistant",
      content: "hi",
      createdAt: "2026-01-01T00:00:00Z",
    });
  });

  it("rejects rows with an unexpected role instead of crashing", () => {
    expect(mapChatMessage({ id: 7, role: "system", content: "hi", created_at: "2026-01-01T00:00:00Z" })).toBeNull();
  });
});

describe("parseChatContent", () => {
  it("trims surrounding whitespace", () => {
    expect(parseChatContent("  hello  ", 100)).toBe("hello");
  });

  it("rejects non-strings, blanks, and oversized messages", () => {
    expect(parseChatContent(42, 100)).toBeNull();
    expect(parseChatContent(undefined, 100)).toBeNull();
    expect(parseChatContent("   ", 100)).toBeNull();
    expect(parseChatContent("abcdef", 5)).toBeNull();
  });
});
