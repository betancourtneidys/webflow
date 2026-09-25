"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, ChevronLeft } from "lucide-react";
import type { Incident } from "@/lib/types";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { STATUS_TEXT, SimulationChip, StatusDot, Wordmark } from "./ui";

export function IncidentBrief({ incident, onInvestigate }: { incident: Incident; onInvestigate: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Enter" && onInvestigate();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onInvestigate]);

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="grid-dots pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] blur-[1px] [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_65%)]">
        <ArchitectureDiagram incident={incident} />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link href="/">
          <Wordmark />
        </Link>
        <Link href="/incidents" className="flex items-center gap-1 text-sm text-muted transition hover:text-fg">
          <ChevronLeft className="size-4" />
          All incidents
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          className="w-full max-w-[440px] rounded-2xl border border-line-strong bg-surface/90 shadow-[0_30px_120px_-30px_rgb(255_93_97/0.25)] backdrop-blur-xl"
        >
          <div className="border-b border-line p-6">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-critical">
                <StatusDot status="critical" pulse />
                Incident · {incident.severity}
              </span>
              <SimulationChip />
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">
              <span className="mr-2">{incident.emoji}</span>
              {incident.title}
            </h1>
            <p className="mt-1.5 text-sm text-muted">Started {incident.startedAgo} · {incident.startedAt}</p>
            <p className="mt-4 text-[14px] leading-relaxed text-fg/80">{incident.summary}</p>
          </div>

          <dl className="divide-y divide-line px-6">
            {incident.headline.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.08 }}
                className="flex items-center justify-between py-3"
              >
                <dt className="text-sm text-muted">{m.label}</dt>
                <dd className="flex items-center gap-2.5">
                  <span className={`font-mono text-sm font-medium tabular-nums ${STATUS_TEXT[m.status]}`}>{m.value}</span>
                  <StatusDot status={m.status} />
                </dd>
              </motion.div>
            ))}
          </dl>

          <div className="p-6">
            <button
              onClick={onInvestigate}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-fg px-4 py-3 text-sm font-semibold tracking-wide text-bg transition hover:bg-white"
            >
              INVESTIGATE INCIDENT
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </button>
            <p className="mt-3 text-center text-xs text-faint">Press Enter to start · the clock starts now</p>
            <p className="mt-1 text-center text-xs text-faint">This is a drill · fictional systems and data</p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
