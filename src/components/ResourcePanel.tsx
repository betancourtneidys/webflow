"use client";

import { motion } from "motion/react";
import { CircleCheck, MessageSquareText, Sparkles, X } from "lucide-react";
import type { Incident, Resource } from "@/lib/types";
import { CapacityBar, KindIcon, STATUS_TEXT, Sparkline, StatusDot } from "./ui";

interface Props {
  incident: Incident;
  resource: Resource;
  onClose: () => void;
  onAsk: (question: string) => void;
}

const STATUS_LABEL = { critical: "Critical", warning: "Degraded", healthy: "Healthy", neutral: "Info" };

export function ResourcePanel({ incident, resource, onClose, onAsk }: Props) {
  const evidence = incident.evidence.find((e) => e.id === resource.evidence);

  return (
    <motion.div
      key={resource.id}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex h-full flex-col"
    >
      <div className="flex items-start gap-3 border-b border-line p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-raised">
          <KindIcon kind={resource.kind} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted">{resource.service}</div>
          <h2 className="truncate text-base font-semibold">{resource.name}</h2>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <StatusDot status={resource.status} />
            {STATUS_LABEL[resource.status]}
          </div>
        </div>
        <button
          onClick={onClose}
          className="hidden rounded-md p-1 text-muted transition hover:bg-white/5 hover:text-fg xl:block"
          aria-label="Close panel"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto p-5">
        {evidence && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex items-start gap-2.5 rounded-lg border border-accent/25 bg-accent/[0.07] px-3 py-2.5 text-[13px]"
          >
            <CircleCheck className="mt-px size-4 shrink-0 text-accent" />
            <div>
              <div className="font-medium text-accent">Evidence collected</div>
              <div className="text-fg/80">{evidence.label}</div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {resource.metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i + 0.05 }}
              className="rounded-lg border border-line bg-raised/60 p-3"
            >
              <div className="text-[11px] text-muted">{m.label}</div>
              <div
                className={`mt-1 break-words font-mono font-medium tabular-nums leading-tight ${m.value.length > 10 ? "text-[15px]" : "text-lg"} ${STATUS_TEXT[m.status]}`}
              >
                {m.value}
              </div>
              {m.series && (
                <div className="mt-2.5">
                  <Sparkline values={m.series} status={m.status} height={28} />
                </div>
              )}
              {m.bar && (
                <div className="mt-3">
                  <CapacityBar value={m.bar.value} max={m.bar.max} status={m.status} />
                </div>
              )}
              {m.caption && <div className="mt-2 text-[11px] text-faint">{m.caption}</div>}
            </motion.div>
          ))}
        </div>

        <div className="rounded-lg border border-line bg-gradient-to-b from-white/[0.03] to-transparent p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-accent">
            <Sparkles className="size-3.5" />
            Assistant observation
          </div>
          <p className="text-[13.5px] leading-relaxed text-fg/85">{resource.observation}</p>
        </div>

        {resource.details && (
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-muted">{resource.details.title}</div>
            <pre className="whitespace-pre-wrap break-words rounded-lg border border-line bg-black/40 p-3 font-mono text-[11.5px] leading-relaxed">
              {resource.details.lines.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith("+")
                      ? "text-healthy"
                      : line.startsWith("-")
                        ? "text-critical"
                        : /ERROR|Error|AccessDenied/.test(line)
                          ? "text-critical/90"
                          : /WARN/.test(line)
                            ? "text-warning"
                            : "text-fg/70"
                  }
                >
                  {line || " "}
                </div>
              ))}
            </pre>
          </div>
        )}

        <button
          onClick={() => onAsk(`Why is ${resource.name} relevant?`)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-line-strong px-3 py-2 text-[13px] text-muted transition hover:border-white/25 hover:text-fg"
        >
          <MessageSquareText className="size-4" />
          Ask the assistant about {resource.name}
        </button>
      </div>
    </motion.div>
  );
}
