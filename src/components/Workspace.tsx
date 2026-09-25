"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Check, Circle, Clock, FlaskConical, MousePointerClick, Search, Sparkles, X } from "lucide-react";
import type { Incident } from "@/lib/types";
import { fallbackAnswer } from "@/lib/assistant";
import { formatElapsed } from "@/lib/format";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { AssistantPanel, type ChatMessage } from "./AssistantPanel";
import { HypothesisDialog } from "./HypothesisDialog";
import { ResourcePanel } from "./ResourcePanel";
import { Timeline } from "./Timeline";
import { Logo, StatusDot } from "./ui";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface Props {
  incident: Incident;
  startedAt: number;
  onResolved: (result: { evidence: number; attempts: number }) => void;
}

export function Workspace({ incident, startedAt, onResolved }: Props) {
  const [now, setNow] = useState(startedAt);
  const [selected, setSelected] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<number | null>(null);
  const [inspected, setInspected] = useState<string[]>([]);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [tab, setTab] = useState<"inspect" | "assistant">("inspect");
  // Below xl the right panel is a drawer; on xl it is always visible.
  const [drawer, setDrawer] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [toast, setToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "I'm following this incident with you. Click any resource on the diagram to inspect it — I'll help you connect what you find.",
    },
  ]);

  const ready = evidence.length >= incident.minEvidence;
  const resource = incident.resources.find((r) => r.id === selected);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const inspect = useCallback(
    (id: string) => {
      const r = incident.resources.find((x) => x.id === id);
      if (!r) return;
      setSelected(id);
      setTab("inspect");
      setDrawer(true);
      setInspected((list) => (list.includes(id) ? list : [...list, id]));
      if (r.evidence && !evidence.includes(r.evidence)) {
        setEvidence([...evidence, r.evidence]);
        if (evidence.length + 1 === incident.minEvidence) {
          setToast(true);
          setTimeout(() => setToast(false), 6000);
        }
      }
    },
    [incident, evidence],
  );

  const ask = useCallback(
    async (question: string) => {
      setTab("assistant");
      setDrawer(true);
      setLoading(true);
      const history = messages.slice(1);
      setMessages((m) => [...m, { role: "user", text: question }]);
      const payload = { incidentId: incident.id, question, evidence, inspected };
      const minDelay = new Promise((r) => setTimeout(r, 650));
      let answer: string;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20_000);
        const res = await fetch(`${BASE_PATH}/api/assistant`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...payload, history }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { answer?: string };
        if (!data.answer) throw new Error("empty");
        answer = data.answer;
      } catch {
        // Demo mode: answer locally from the scenario data.
        answer = fallbackAnswer(incident, payload);
      }
      await minDelay;
      setMessages((m) => [...m, { role: "assistant", text: answer }]);
      setLoading(false);
    },
    [incident, evidence, inspected, messages],
  );

  const selectEvent = (i: number) => {
    setActiveEvent(i);
    inspect(incident.timeline[i].resource);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !dialog) {
        setSelected(null);
        setDrawer(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog]);

  const highlighted = activeEvent !== null ? incident.timeline[activeEvent].resource : null;

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:min-h-0">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line px-4 sm:px-5">
        <Link href="/" aria-label="Cloud Detective home" className="text-fg">
          <Logo size={24} />
        </Link>
        <span className="h-5 w-px bg-line-strong" />
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <StatusDot status="critical" pulse />
          <span className="truncate font-medium">{incident.title}</span>
          <span className="hidden rounded-md border border-critical/30 bg-critical/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-critical sm:inline">
            {incident.severity}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="hidden items-center gap-1.5 font-mono tabular-nums text-muted sm:flex">
            <Clock className="size-3.5" />
            {formatElapsed(now - startedAt)}
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            <Search className="size-3.5" />
            <motion.span key={evidence.length} initial={{ scale: 1.5, color: "#9aa8ff" }} animate={{ scale: 1, color: "#8b91a1" }} className="font-mono tabular-nums">
              {evidence.length}/{incident.evidence.length}
            </motion.span>
          </span>
          <button
            onClick={() => {
              setTab("assistant");
              setDrawer(true);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-medium text-muted transition hover:text-fg xl:hidden"
          >
            <Sparkles className="size-3.5 text-accent" />
            Assistant
          </button>
          <button
            onClick={() => setDialog(true)}
            disabled={!ready}
            className={`hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:flex ${ready ? "bg-accent text-bg hover:brightness-110" : "border border-line-strong text-faint"}`}
          >
            <FlaskConical className="size-3.5" />
            Build hypothesis
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:min-h-0 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_380px]">
        {/* Sidebar */}
        <aside className="scrollbar-thin space-y-6 border-b border-line p-5 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div>
            <div className="text-2xl">{incident.emoji}</div>
            <h1 className="mt-2 text-[15px] font-semibold leading-snug">{incident.title}</h1>
            <dl className="mt-3 space-y-1.5 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">Severity</dt>
                <dd className="font-medium capitalize text-critical">{incident.severity}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Started</dt>
                <dd className="font-mono">{incident.startedAt}</dd>
              </div>
            </dl>
          </div>

          <div className="grid grid-cols-2 gap-6 lg:grid-cols-1">
            <section>
              <h2 className="mb-2.5 text-[11px] uppercase tracking-[0.14em] text-muted">Investigation</h2>
              <ul className="space-y-0.5">
                {incident.resources.map((r) => {
                  const done = inspected.includes(r.id);
                  return (
                    <li key={r.id}>
                      <button
                        onClick={() => inspect(r.id)}
                        className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition hover:bg-white/[0.04] ${selected === r.id ? "bg-white/[0.05]" : ""}`}
                      >
                        {done ? (
                          <Check className="size-3.5 shrink-0 text-accent" strokeWidth={3} />
                        ) : (
                          <Circle className="size-3.5 shrink-0 text-faint" />
                        )}
                        <span className={`truncate ${done ? "text-fg" : "text-muted"}`}>{r.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section>
              <div className="mb-2.5 flex items-baseline justify-between">
                <h2 className="text-[11px] uppercase tracking-[0.14em] text-muted">Evidence</h2>
                <span className="font-mono text-xs tabular-nums text-muted">
                  {evidence.length} / {incident.evidence.length}
                </span>
              </div>
              <div className="mb-3 flex gap-1">
                {incident.evidence.map((_, i) => (
                  <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <motion.span
                      className="block h-full bg-accent"
                      initial={false}
                      animate={{ width: i < evidence.length ? "100%" : "0%" }}
                      transition={{ duration: 0.4 }}
                    />
                  </span>
                ))}
              </div>
              <ul className="space-y-2">
                {evidence.map((id) => {
                  const e = incident.evidence.find((x) => x.id === id)!;
                  return (
                    <motion.li
                      key={id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-2 text-[12.5px] leading-snug"
                    >
                      <Check className="mt-0.5 size-3.5 shrink-0 text-accent" strokeWidth={3} />
                      <span>{e.label}</span>
                    </motion.li>
                  );
                })}
                {Array.from({ length: incident.evidence.length - evidence.length }, (_, i) => (
                  <li key={`p${i}`} className="flex gap-2 text-[12.5px] text-faint">
                    <Circle className="mt-0.5 size-3.5 shrink-0" />
                    Undiscovered signal
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div
            className={`rounded-xl border p-4 transition-colors ${ready ? "border-accent/40 bg-accent/[0.07]" : "border-line bg-raised/40"}`}
          >
            <p className="text-[13px] leading-snug">
              {ready
                ? "You have enough evidence to form a hypothesis."
                : `Collect ${incident.minEvidence - evidence.length} more piece${incident.minEvidence - evidence.length === 1 ? "" : "s"} of evidence to form a hypothesis.`}
            </p>
            <button
              onClick={() => setDialog(true)}
              disabled={!ready}
              className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold tracking-wide transition ${ready ? "bg-accent text-bg hover:brightness-110" : "cursor-not-allowed bg-white/[0.05] text-faint"}`}
            >
              <FlaskConical className="size-3.5" />
              BUILD HYPOTHESIS
            </button>
          </div>
        </aside>

        {/* Center: architecture + timeline */}
        <section className="flex min-w-0 flex-col lg:min-h-0">
          <div className="relative h-[420px] border-b border-line lg:h-auto lg:flex-1">
            <div className="grid-dots absolute inset-0" />
            <div className="absolute left-5 top-4 z-10 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted">
              Architecture
              {inspected.length === 0 && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="flex items-center gap-1 normal-case tracking-normal text-accent"
                >
                  <MousePointerClick className="size-3.5" />
                  Click a resource to inspect it
                </motion.span>
              )}
            </div>
            <div className="absolute inset-x-4 bottom-4 top-12">
              <ArchitectureDiagram
                incident={incident}
                selected={selected}
                highlighted={highlighted}
                inspected={inspected}
                onSelect={inspect}
              />
            </div>
          </div>
          <div className="shrink-0 px-4 pb-3 pt-4">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-[11px] uppercase tracking-[0.14em] text-muted">Timeline</h2>
              <span className="text-[11px] text-faint">Select an event to jump to its resource</span>
            </div>
            <Timeline events={incident.timeline} active={activeEvent} onSelect={selectEvent} />
          </div>
        </section>

        {/* Right: inspector / assistant */}
        {drawer && (
          <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] xl:hidden" onClick={() => setDrawer(false)} />
        )}
        <aside
          className={`fixed inset-y-0 right-0 z-40 flex w-full max-w-[400px] flex-col border-l border-line bg-surface shadow-2xl transition-transform duration-300 ease-out xl:static xl:z-auto xl:w-auto xl:max-w-none xl:translate-x-0 xl:bg-transparent xl:shadow-none xl:transition-none ${drawer ? "translate-x-0" : "translate-x-full"} xl:min-h-0`}
        >
          <div className="flex shrink-0 gap-1 border-b border-line p-2">
            <button
              onClick={() => setDrawer(false)}
              className="grid w-8 place-items-center rounded-md text-muted hover:bg-white/5 hover:text-fg xl:hidden"
              aria-label="Close panel"
            >
              <X className="size-4" />
            </button>
            {(["inspect", "assistant"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition ${tab === t ? "bg-white/[0.07] text-fg" : "text-muted hover:text-fg"}`}
              >
                {t === "inspect" ? <Search className="size-3.5" /> : <Sparkles className="size-3.5" />}
                {t === "inspect" ? "Inspector" : "Assistant"}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1">
            {tab === "assistant" ? (
              <AssistantPanel messages={messages} loading={loading} suggestions={incident.suggestedQuestions} onAsk={ask} />
            ) : (
              <AnimatePresence mode="wait">
                {resource ? (
                  <ResourcePanel key={resource.id} incident={incident} resource={resource} onClose={() => {
                      setSelected(null);
                      setDrawer(false);
                    }}
                    onAsk={ask}
                  />
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-full flex-col items-center justify-center p-8 text-center"
                  >
                    <span className="grid size-12 place-items-center rounded-2xl border border-line bg-raised">
                      <Search className="size-5 text-muted" />
                    </span>
                    <p className="mt-4 text-sm font-medium">Nothing selected</p>
                    <p className="mt-1 max-w-[240px] text-[13px] leading-relaxed text-muted">
                      Pick a resource on the diagram or an event on the timeline to see its metrics and logs.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {toast && !dialog && (
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            onClick={() => {
              setToast(false);
              setDialog(true);
            }}
            // Phones: full-width card; sm+: centered pill. Kept above Webflow's
            // bottom-right "Made in Webflow" badge until the screen is wide enough.
            className="fixed inset-x-4 bottom-16 z-[45] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-accent/40 bg-surface/95 py-2.5 pl-4 pr-2.5 text-sm shadow-2xl backdrop-blur sm:inset-x-auto sm:left-1/2 sm:w-max sm:max-w-none sm:-translate-x-1/2 sm:rounded-full sm:py-2 sm:pr-2 lg:bottom-6"
          >
            <Sparkles className="size-4 shrink-0 text-accent" />
            <span className="flex-1 text-left leading-snug">You have enough evidence to form a hypothesis.</span>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-bg">
              Build hypothesis
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dialog && (
          <HypothesisDialog
            incident={incident}
            onClose={() => setDialog(false)}
            onResolved={(attempts) => onResolved({ evidence: evidence.length, attempts })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
