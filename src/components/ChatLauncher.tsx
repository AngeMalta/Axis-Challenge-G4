import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Loader2, RotateCcw, SendHorizontal, X } from "lucide-react";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ChatbotError,
  chatbotEnabled,
  loadChatSession,
  newThreadId,
  saveChatSession,
  sendChatMessage,
  type ChatMessage,
} from "@/lib/chatbot";
import { cn } from "@/lib/utils";

const suggestions = [
  "Quais carregadores estão disponíveis agora?",
  "Qual o carregador mais barato?",
  "Como funciona a recarga pelo AXIS?",
];

// After this long without a reply, explain that the server may be waking up.
const SLOW_REPLY_MS = 5000;

/**
 * Floating button that opens the AXIS assistant. Sits above the mobile bottom
 * nav; the panel is a floating card on larger screens and full screen on phones.
 */
export function ChatLauncher() {
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState(() => loadChatSession().threadId || newThreadId());
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatSession().messages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<{ text: string; question: string } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => saveChatSession(threadId, messages), [threadId, messages]);

  useEffect(() => {
    if (!chatbotEnabled)
      console.warn("[AXIS] Chatbot desativado: defina VITE_CHATBOT_API_URL no .env");
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, pending, slow, error, open]);

  useEffect(() => {
    if (!pending) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), SLOW_REPLY_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const ask = async (question: string) => {
    setError(null);
    setPending(true);
    try {
      const reply = await sendChatMessage(question, threadId);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      const text =
        err instanceof ChatbotError
          ? err.message
          : "Algo deu errado ao falar com o assistente. Tente de novo.";
      setError({ text, question });
    } finally {
      setPending(false);
    }
  };

  const send = (text: string) => {
    const question = text.trim();
    if (!question || pending) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setDraft("");
    void ask(question);
  };

  const startOver = () => {
    if (pending) return;
    setThreadId(newThreadId());
    setMessages([]);
    setError(null);
    inputRef.current?.focus();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls="axis-chat-panel"
        aria-label={open ? "Fechar assistente" : "Abrir assistente AXIS"}
        className={cn(
          "fixed bottom-[calc(var(--app-bottom-nav-h)+1rem)] right-4 z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg axis-glow transition-transform",
          "hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:hover:scale-100",
          "md:bottom-6 md:right-6",
          open && "max-sm:hidden",
        )}
      >
        {open ? <X className="size-6" /> : <Bot className="size-6" />}
      </button>

      {open && (
        <section
          id="axis-chat-panel"
          role="dialog"
          aria-label="Assistente AXIS"
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden border-border bg-card text-card-foreground shadow-2xl",
            // Phones: full screen. Larger screens: floating card above the button.
            "inset-0 pb-[env(safe-area-inset-bottom)] sm:inset-auto sm:bottom-[calc(var(--app-bottom-nav-h)+5.5rem)] sm:right-4 sm:h-[min(36rem,calc(100dvh-var(--app-bottom-nav-h)-8rem))] sm:w-[min(24rem,calc(100vw-2rem))] sm:rounded-3xl sm:border sm:pb-0",
            "md:bottom-24 md:right-6",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-200",
          )}
        >
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Bot className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold">Assistente AXIS</h2>
              <p className="truncate text-xs text-muted-foreground">
                Preços, disponibilidade e dúvidas sobre o site
              </p>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={startOver}
                disabled={pending}
                aria-label="Nova conversa"
                title="Nova conversa"
                className="shrink-0 rounded-full text-muted-foreground"
              >
                <RotateCcw className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={close}
              aria-label="Fechar assistente"
              className="shrink-0 rounded-full text-muted-foreground"
            >
              <X className="size-5" />
            </Button>
          </header>

          {!chatbotEnabled ? (
            <div className="grid flex-1 place-items-center p-6 text-center">
              <p className="max-w-xs text-sm text-muted-foreground">
                O assistente não está disponível no momento. Tente novamente mais tarde.
              </p>
            </div>
          ) : (
            <>
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
                aria-live="polite"
              >
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Olá! Posso ajudar com preços, disponibilidade dos carregadores e dúvidas sobre
                      o AXIS.
                    </p>
                    <div className="flex flex-col items-start gap-2">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => send(s)}
                          className="rounded-full border border-border px-3 py-1.5 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) =>
                  m.role === "user" ? (
                    <div
                      key={i}
                      className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm leading-relaxed text-primary-foreground"
                    >
                      {m.content}
                    </div>
                  ) : (
                    <div
                      key={i}
                      className="w-fit max-w-[90%] break-words rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-sm leading-relaxed text-foreground"
                    >
                      <ChatMarkdown text={m.content} />
                    </div>
                  ),
                )}

                {pending && (
                  <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />{" "}
                      Pensando...
                    </span>
                    {slow && (
                      <p className="mt-1 text-xs">
                        Conectando ao assistente, isso pode levar até 1 minuto.
                      </p>
                    )}
                  </div>
                )}

                {error && (
                  <div className="space-y-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm">
                    <p className="text-destructive">{error.text}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => void ask(error.question)}
                    >
                      Tentar de novo
                    </Button>
                  </div>
                )}
              </div>

              <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-border p-3">
                <Textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(draft);
                    }
                  }}
                  rows={1}
                  maxLength={1000}
                  placeholder="Escreva sua pergunta"
                  aria-label="Mensagem para o assistente"
                  className="max-h-32 min-h-10 resize-none rounded-2xl bg-background"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!draft.trim() || pending}
                  aria-label="Enviar mensagem"
                  className="size-10 shrink-0 rounded-full"
                >
                  <SendHorizontal className="size-4" />
                </Button>
              </form>
            </>
          )}
        </section>
      )}
    </>
  );
}
