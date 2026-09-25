"use client";

import { motion } from "motion/react";
import type { Incident } from "@/lib/types";
import { formatElapsed } from "@/lib/format";
import { useSolved } from "@/lib/progress";

const RANKS = { 1: "Rookie", 2: "Detective", 3: "Inspector", 4: "Chief" } as const;

export function Difficulty({ level }: { level: Incident["difficulty"] }) {
  return (
    <span className="flex items-center gap-2 text-[12px] text-muted">
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`size-1.5 rounded-full ${i <= level ? "bg-accent" : "bg-white/10"}`} />
        ))}
      </span>
      {RANKS[level]}
    </span>
  );
}

/** "UNSOLVED" / "SOLVED" rubber stamp, backed by the local solve record. */
export function CaseStamp({ id }: { id: string }) {
  const solved = useSolved();
  if (!solved) return <span className="h-6" aria-hidden />;
  const record = solved[id];

  return (
    <motion.span
      key={record ? "solved" : "open"}
      initial={{ opacity: 0, scale: 1.5, rotate: -16 }}
      animate={{ opacity: 1, scale: 1, rotate: -7 }}
      transition={{ type: "spring", stiffness: 420, damping: 17, delay: 0.15 }}
      className={`inline-flex flex-col items-center rounded-md border-2 px-2 py-0.5 font-mono text-[10.5px] font-bold uppercase leading-tight tracking-[0.18em] ${
        record ? "border-healthy/70 text-healthy" : "border-critical/60 text-critical/90"
      }`}
    >
      {record ? "Solved" : "Unsolved"}
      {record && <span className="text-[9.5px] font-medium tracking-[0.1em] opacity-80">best {formatElapsed(record.bestMs)}</span>}
    </motion.span>
  );
}
