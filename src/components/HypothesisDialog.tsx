"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import type { Incident, ResolutionOption } from "@/lib/types";

interface Props {
  incident: Incident;
  onClose: () => void;
  onResolved: (attempts: number) => void;
}

type Step = "suspect" | "hypothesis" | "action";

/** Multiple-choice list shared by the "suspect" and "fix" steps. */
function Choices({
  options,
  onWrong,
  onCorrect,
}: {
  options: ResolutionOption[];
  onWrong: () => void;
  onCorrect: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const solved = options.some((o) => o.correct && o.id === picked);

  const pick = (option: ResolutionOption) => {
    if (solved) return;
    setPicked(option.id);
    if (option.correct) {
      onCorrect();
    } else if (!wrong.includes(option.id)) {
      setWrong((w) => [...w, option.id]);
      onWrong();
    }
  };

  return (
    <div className="mt-5 space-y-2">
      {options.map((o, i) => {
        const isPicked = picked === o.id;
        const isWrong = wrong.includes(o.id);
        const isRight = isPicked && o.correct;
        return (
          <motion.button
            key={o.id}
            onClick={() => pick(o)}
            disabled={isWrong || solved}
            animate={isPicked && !o.correct ? { x: [0, -6, 6, -4, 4, 0] } : {}}
            transition={{ duration: 0.35 }}
            className={[
              "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition",
              isRight
                ? "border-healthy/60 bg-healthy/[0.08]"
                : isWrong
                  ? "border-critical/30 bg-critical/[0.04] opacity-70"
                  : "border-line-strong hover:border-white/25 hover:bg-white/[0.02]",
            ].join(" ")}
          >
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-md border font-mono text-xs ${isRight ? "border-healthy bg-healthy text-bg" : isWrong ? "border-critical/50 text-critical" : "border-line-strong text-muted"}`}
            >
              {isRight ? <Check className="size-3.5" strokeWidth={3} /> : isWrong ? <X className="size-3.5" /> : String.fromCharCode(65 + i)}
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-medium">{o.label}</span>
              <span className="mt-0.5 block text-[12.5px] text-muted">{o.detail}</span>
              {(isWrong || isRight) && (
                <motion.span
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className={`mt-2 block text-[12.5px] ${isRight ? "text-healthy" : "text-critical/90"}`}
                >
                  {o.feedback}
                </motion.span>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

export function HypothesisDialog({ incident, onClose, onResolved }: Props) {
  const steps: Step[] = incident.suspects ? ["suspect", "hypothesis", "action"] : ["hypothesis", "action"];
  const [step, setStep] = useState<Step>(steps[0]);
  const [misses, setMisses] = useState(0);
  const [fixed, setFixed] = useState(false);
  const labels: Record<Step, string> = { suspect: "Suspect", hypothesis: "Hypothesis", action: "Resolution" };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const slide = { initial: { opacity: 0, x: 12 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -12 } };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="scrollbar-thin max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-2xl border border-line-strong bg-surface shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-3 text-xs text-muted">
            {steps.map((s, i) => (
              <span key={s} className="flex items-center gap-3">
                {i > 0 && <span className="h-px w-6 bg-line-strong" />}
                <span className={step === s ? "text-fg" : ""}>
                  {i + 1} · {labels[s]}
                </span>
              </span>
            ))}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-white/5 hover:text-fg" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === "suspect" && incident.suspects && (
            <motion.div key="s" {...slide} className="p-6">
              <h2 className="text-2xl font-semibold tracking-tight">Which explanation fits the evidence?</h2>
              <p className="mt-1.5 text-sm text-muted">Several things look suspicious. Only one explains every signal.</p>
              <Choices
                options={incident.suspects}
                onWrong={() => setMisses((m) => m + 1)}
                onCorrect={() => setTimeout(() => setStep("hypothesis"), 1300)}
              />
            </motion.div>
          )}

          {step === "hypothesis" && (
            <motion.div key="h" {...slide} className="p-6">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-accent">
                <Sparkles className="size-3.5" />
                {incident.suspects ? "Root cause confirmed" : "Likely root cause"}
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">{incident.rootCause.title}</h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-fg/80">{incident.rootCause.hypothesis}</p>

              <div className="mt-5 flex items-center gap-2 text-sm">
                <span className="text-muted">Confidence</span>
                <span className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className={`h-1.5 w-5 rounded-full ${i < (incident.rootCause.confidence === "High" ? 3 : 2) ? "bg-healthy" : "bg-white/10"}`} />
                  ))}
                </span>
                <span className="font-medium text-healthy">{incident.rootCause.confidence}</span>
              </div>

              <div className="mt-6 rounded-xl border border-line bg-raised/50 p-4">
                <div className="mb-3 text-[11px] uppercase tracking-[0.14em] text-muted">Causal chain</div>
                <ol className="space-y-0">
                  {incident.rootCause.chain.map((link, i) => (
                    <motion.li
                      key={link}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.12 }}
                      className="relative flex gap-3 pb-3 last:pb-0"
                    >
                      {i < incident.rootCause.chain.length - 1 && (
                        <span className="absolute left-[7px] top-4 h-[calc(100%-8px)] w-px bg-line-strong" />
                      )}
                      <span
                        className={`relative mt-1 size-[15px] shrink-0 rounded-full border-2 ${i === incident.rootCause.chain.length - 1 ? "border-critical" : i === 0 ? "border-accent" : "border-line-strong"} bg-surface`}
                      />
                      <span className="text-[13.5px] text-fg/85">{link}</span>
                    </motion.li>
                  ))}
                </ol>
              </div>

              <button
                onClick={() => setStep("action")}
                className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-fg px-4 py-3 text-sm font-semibold text-bg transition hover:bg-white"
              >
                Decide the fix
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </button>
            </motion.div>
          )}

          {step === "action" && (
            <motion.div key="a" {...slide} className="p-6">
              <h2 className="text-2xl font-semibold tracking-tight">{incident.question}</h2>
              <p className="mt-1.5 text-sm text-muted">Pick the change that fixes the root cause, not just the symptom.</p>
              <Choices
                options={incident.options}
                onWrong={() => setMisses((m) => m + 1)}
                onCorrect={() => {
                  setFixed(true);
                  setTimeout(() => onResolved(misses + 1), 1400);
                }}
              />
              {!fixed && (
                <button onClick={() => setStep("hypothesis")} className="mt-4 text-xs text-muted hover:text-fg">
                  ← Back to hypothesis
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
