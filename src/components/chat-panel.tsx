"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { ChatMessage } from "@/lib/chat";
import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/constants";

// Self-contained chat UI for one saved plan. The page mounts it with
// key={plan.id}, so switching plans remounts it and reloads that plan's
// history instead of showing stale messages from the previous plan.
export function ChatPanel({ planId }: { planId: number }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  // Marks the bottom of the list so each update can scroll it into view.
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Declared inside the effect so the hooks lint rule can see that state
    // updates only happen after the awaited fetch, never synchronously.
    async function loadHistory() {
      try {
        const response = await fetch(`/api/plans/${planId}/chat`);
        const result = (await response.json()) as { messages?: ChatMessage[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "We couldn't load the conversation.");
        setMessages(result.messages ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "We couldn't load the conversation.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadHistory();
  }, [planId]);

  // Keeps the newest message visible as the conversation grows or while the
  // "thinking" indicator appears.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, isSending]);

  async function send() {
    const content = draft.trim();
    if (!content || isSending) return;
    setError("");
    setDraft("");
    // Optimistic bubble with a negative temporary id — real ids are positive
    // database values, so they can never collide.
    const tempId = -Date.now();
    setMessages((previous) => [...previous, { id: tempId, role: "user", content, createdAt: new Date().toISOString() }]);
    setIsSending(true);
    try {
      const response = await fetch(`/api/plans/${planId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const result = (await response.json()) as { userMessage?: ChatMessage; assistantMessage?: ChatMessage; error?: string };
      const { userMessage, assistantMessage } = result;
      if (!response.ok || !userMessage || !assistantMessage) throw new Error(result.error ?? "We couldn't get an answer.");
      // Swap the optimistic bubble for the two confirmed server rows.
      setMessages((previous) => [...previous.filter((message) => message.id !== tempId), userMessage, assistantMessage]);
    } catch (requestError) {
      // Roll back the optimistic bubble and restore the text so nothing the
      // user typed is lost to a failed request.
      setMessages((previous) => previous.filter((message) => message.id !== tempId));
      setDraft(content);
      setError(requestError instanceof Error ? requestError.message : "We couldn't get an answer.");
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter inserts a newline like any chat app.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  async function clearChat() {
    if (messages.length === 0 || isSending) return;
    if (!window.confirm("Clear this conversation? This can't be undone.")) return;
    try {
      const response = await fetch(`/api/plans/${planId}/chat`, { method: "DELETE" });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(result.error ?? "We couldn't clear the conversation.");
      }
      setMessages([]);
      setError("");
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "We couldn't clear the conversation.");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send();
  }

  return (
    <div className="mt-7 border-t border-slate-200 pt-5 dark:border-slate-800">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Ask about your materials</p>
        {messages.length > 0 && (
          <button type="button" onClick={() => void clearChat()} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400">
            Clear
          </button>
        )}
      </div>

      <div aria-live="polite" className="mt-3 max-h-96 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/60 dark:ring-1 dark:ring-slate-800">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Loading conversation…</p>
        ) : messages.length === 0 && !isSending ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Ask anything about your uploaded notes or this plan — answers come only from your own materials.</p>
        ) : (
          <>
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-emerald-700 px-4 py-2.5 text-sm leading-6 text-white dark:bg-emerald-600">{message.content}</p>
                </div>
              ) : (
                <div key={message.id} className="flex justify-start">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm leading-6 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">{message.content}</p>
                </div>
              ),
            )}
            {isSending && (
              <div className="flex justify-start">
                <p className="rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm text-slate-400 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:ring-slate-800">Thinking…</p>
              </div>
            )}
            <div ref={endRef} />
          </>
        )}
      </div>

      {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-1 dark:ring-rose-900/50">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-3">
        <textarea
          aria-label="Ask a question about your materials"
          className="min-h-12 flex-1 resize-y rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/40 dark:disabled:bg-slate-800"
          placeholder="e.g. Quiz me on the chapter 4 formulas"
          rows={2}
          maxLength={MAX_CHAT_MESSAGE_LENGTH}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading || isSending}
        />
        <button type="submit" disabled={isLoading || isSending || !draft.trim()} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-600">
          Ask
        </button>
      </form>
    </div>
  );
}
