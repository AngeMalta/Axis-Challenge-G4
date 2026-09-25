/**
 * Client for the AXIS assistant (FastAPI on Render, see VITE_CHATBOT_API_URL in .env).
 *
 * API contract:
 *   POST {VITE_CHATBOT_API_URL}/chat   { pergunta: string, thread_id: string }  ->  { resposta: string }
 * The conversation history lives on the server, keyed by thread_id, so the client
 * only has to keep sending the same id for the same conversation.
 */

const baseUrl = ((import.meta.env["VITE_CHATBOT_API_URL"] as string | undefined) ?? "").replace(
  /\/+$/,
  "",
);

export const chatbotEnabled = baseUrl !== "";

// Render's free tier sleeps when idle; the first request can take up to a minute.
const REQUEST_TIMEOUT_MS = 90_000;

export type ChatMessage = { role: "user" | "assistant"; content: string };

export class ChatbotError extends Error {}

// The server keeps the history per thread_id; the browser keeps the id (and a copy
// of the messages to redraw them) for the current tab only.
const THREAD_KEY = "axis-chat-thread";
const MESSAGES_KEY = "axis-chat-messages";

export function loadChatSession(): { threadId: string; messages: ChatMessage[] } {
  try {
    const messages = JSON.parse(sessionStorage.getItem(MESSAGES_KEY) ?? "[]") as unknown;
    return {
      threadId: sessionStorage.getItem(THREAD_KEY) ?? "",
      messages: Array.isArray(messages) ? (messages as ChatMessage[]) : [],
    };
  } catch {
    return { threadId: "", messages: [] };
  }
}

export function saveChatSession(threadId: string, messages: ChatMessage[]) {
  try {
    sessionStorage.setItem(THREAD_KEY, threadId);
    sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  } catch {
    // Storage blocked (private mode etc.): the chat still works for this page view.
  }
}

/** Forget the conversation in this tab, e.g. when the user signs out. */
export function clearChatSession() {
  try {
    sessionStorage.removeItem(THREAD_KEY);
    sessionStorage.removeItem(MESSAGES_KEY);
  } catch {
    // Nothing to clear.
  }
}

export function newThreadId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

export async function sendChatMessage(pergunta: string, threadId: string): Promise<string> {
  if (!chatbotEnabled) throw new ChatbotError("O assistente não está configurado.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta, thread_id: threadId }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ChatbotError(
        "O assistente demorou demais para responder. Tente de novo em instantes.",
      );
    }
    throw new ChatbotError("Sem conexão com o assistente. Verifique sua internet e tente de novo.");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new ChatbotError(
      `O assistente não respondeu (erro ${res.status}). Tente de novo em instantes.`,
    );
  }

  const data = (await res.json().catch(() => null)) as { resposta?: unknown } | null;
  const resposta = typeof data?.resposta === "string" ? data.resposta.trim() : "";
  if (!resposta) throw new ChatbotError("O assistente enviou uma resposta vazia. Tente de novo.");
  return resposta;
}
