"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowUp, Sparkles } from "lucide-react";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  suggestions: string[];
  onAsk: (question: string) => void;
}

function TypedText({ text }: { text: string }) {
  const words = text.split(" ");
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= words.length) clearInterval(id);
        return c + 1;
      });
    }, 28);
    return () => clearInterval(id);
  }, [words.length]);
  return <>{words.slice(0, count).join(" ")}</>;
}

export function AssistantPanel({ messages, loading, suggestions, onAsk }: Props) {
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const asked = new Set(messages.filter((m) => m.role === "user").map((m) => m.text));

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, loading]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || loading) return;
    onAsk(draft.trim());
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid size-6 place-items-center rounded-md bg-accent/15 text-accent">
            <Sparkles className="size-3.5" />
          </span>
          Investigation assistant
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          Sees the signals you&apos;ve inspected. It won&apos;t name a root cause until the evidence supports one.
        </p>
      </div>

      <div ref={scroller} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-5">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={m.role === "user" ? "flex justify-end" : ""}
          >
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-white/[0.07] px-3.5 py-2 text-[13.5px]">{m.text}</div>
            ) : (
              <div className="text-[13.5px] leading-relaxed text-fg/90">
                {i === messages.length - 1 && i > 0 ? <TypedText text={m.text} /> : m.text}
              </div>
            )}
          </motion.div>
        ))}
        {loading && (
          <div className="flex items-center gap-1.5 py-1 text-xs text-muted">
            <span className="blink size-1.5 rounded-full bg-accent" />
            <span className="blink size-1.5 rounded-full bg-accent [animation-delay:200ms]" />
            <span className="blink size-1.5 rounded-full bg-accent [animation-delay:400ms]" />
            <span className="ml-1.5">Correlating signals…</span>
          </div>
        )}
      </div>

      {/* Extra bottom padding keeps the composer clear of Webflow's fixed "Made in Webflow" badge. */}
      <div className="space-y-3 border-t border-line p-4 pb-14">
        <div className="flex flex-wrap gap-1.5">
          {suggestions
            .filter((s) => !asked.has(s))
            .slice(0, 3)
            .map((s) => (
              <button
                key={s}
                disabled={loading}
                onClick={() => onAsk(s)}
                className="rounded-full border border-line-strong px-2.5 py-1 text-xs text-muted transition hover:border-accent/50 hover:text-fg disabled:opacity-50"
              >
                {s}
              </button>
            ))}
        </div>
        <form onSubmit={submit} className="flex items-center gap-2 rounded-xl border border-line-strong bg-raised px-3 py-2 focus-within:border-accent/50">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about this incident…"
            maxLength={500}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
          />
          <button
            type="submit"
            disabled={!draft.trim() || loading}
            className="grid size-7 place-items-center rounded-lg bg-accent text-bg transition disabled:bg-white/10 disabled:text-faint"
            aria-label="Send"
          >
            <ArrowUp className="size-4" strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </div>
  );
}
