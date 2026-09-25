"use client";

import { motion } from "motion/react";
import type { TimelineEvent } from "@/lib/types";
import { STATUS_COLOR } from "./ui";

interface Props {
  events: TimelineEvent[];
  active: number | null;
  onSelect: (index: number) => void;
}

export function Timeline({ events, active, onSelect }: Props) {
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <ol className="relative flex min-w-[720px] gap-2 px-1 pb-1">
        <span className="pointer-events-none absolute left-4 right-4 top-[7px] h-px bg-line-strong" aria-hidden />
        {events.map((event, i) => {
          const isActive = active === i;
          const color = STATUS_COLOR[event.status];
          return (
            <motion.li
              key={`${event.time}-${i}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.12 }}
              className="relative min-w-0 flex-1 [overflow-wrap:anywhere]"
            >
              <button
                onClick={() => onSelect(i)}
                className={`group w-full rounded-lg px-2.5 pb-2.5 pt-0 text-left transition ${isActive ? "bg-white/[0.04]" : "hover:bg-white/[0.025]"}`}
              >
                <span className="relative flex h-[15px] items-center">
                  <span
                    className="relative size-[9px] rounded-full border-2"
                    style={{
                      borderColor: color,
                      background: isActive ? color : "var(--color-bg)",
                      boxShadow: isActive ? `0 0 0 4px color-mix(in oklab, ${color} 22%, transparent)` : undefined,
                    }}
                  />
                </span>
                <span className="mt-2 block font-mono text-[11px] tabular-nums text-muted">{event.time}</span>
                <span className={`mt-0.5 block text-[12.5px] font-medium leading-snug ${isActive ? "text-fg" : "text-fg/85"}`}>
                  {event.title}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-faint group-hover:text-muted">{event.detail}</span>
              </button>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
