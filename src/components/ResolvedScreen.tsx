"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, CircleCheck, RotateCcw } from "lucide-react";
import type { Incident } from "@/lib/types";
import { Wordmark } from "./ui";

interface Props {
  incident: Incident;
  next: Incident;
  elapsed: string;
  evidence: number;
  attempts: number;
  onReplay: () => void;
}

const BURST = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  const distance = 90 + (i % 3) * 40;
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, color: ["#3ecf8e", "#9aa8ff", "#e8eaf0"][i % 3] };
});

export function ResolvedScreen({ incident, next, elapsed, evidence, attempts, onReplay }: Props) {
  const stats = [
    { label: "Investigation time", value: elapsed },
    { label: "Evidence collected", value: `${evidence} / ${incident.evidence.length}` },
    { label: "Fix attempts", value: String(attempts) },
  ];

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="grid-dots pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_15%,transparent_65%)]" />
      <header className="relative z-10 px-6 py-5">
        <Link href="/">
          <Wordmark />
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
          className="w-full max-w-[520px] text-center"
        >
          <div className="relative mx-auto grid size-16 place-items-center">
            {BURST.map((p, i) => (
              <motion.span
                key={i}
                className="absolute size-1.5 rounded-full"
                style={{ background: p.color }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.4 }}
                transition={{ duration: 1.1, delay: 0.2, ease: "easeOut" }}
              />
            ))}
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
              className="grid size-16 place-items-center rounded-full bg-healthy/15 text-healthy shadow-[0_0_60px_-10px_rgb(62_207_142/0.6)]"
            >
              <CircleCheck className="size-8" strokeWidth={1.75} />
            </motion.span>
          </div>

          <div className="mt-7 text-[11px] font-medium uppercase tracking-[0.2em] text-healthy">🎉 Incident resolved</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{incident.rootCause.title}</h1>
          <p className="mt-2 text-sm text-muted">Root cause identified</p>

          <div className="mt-8 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line-strong bg-surface/80 backdrop-blur">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 + i * 0.1 }}
                className="px-3 py-5"
              >
                <div className="font-mono text-2xl font-medium tabular-nums">{s.value}</div>
                <div className="mt-1 text-[11px] text-muted">{s.label}</div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-5 rounded-2xl border border-line bg-surface/60 p-5 text-left"
          >
            <div className="text-[11px] uppercase tracking-[0.14em] text-accent">Takeaway</div>
            <p className="mt-2 text-[14px] leading-relaxed text-fg/85">{incident.lesson}</p>
          </motion.div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`/incident/${next.id}`}
              className="group flex items-center gap-2 rounded-xl bg-fg px-5 py-3 text-sm font-semibold tracking-wide text-bg transition hover:bg-white"
            >
              NEXT INCIDENT
              <span className="font-normal text-bg/60">· {next.emoji} {next.title}</span>
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </Link>
            <button onClick={onReplay} className="flex items-center gap-1.5 px-3 py-3 text-sm text-muted transition hover:text-fg">
              <RotateCcw className="size-3.5" />
              Replay
            </button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
