"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Search } from "lucide-react";
import type { Incident } from "@/lib/types";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { useLocalePath, useT } from "./LangProvider";
import { CapacityBar, Logo, STATUS_TEXT, StatusDot } from "./ui";

// Clues hidden around the diagram, in the same percent space as resource positions.
// Texts come from the dictionary (t.preview.clues).
const CLUE_POSITIONS = [
  { id: "deploy", x: 16, y: 29 },
  { id: "alb", x: 79, y: 13 },
  { id: "lambda", x: 78, y: 38 },
  { id: "rds", x: 28, y: 96 },
  { id: "sqs", x: 72, y: 96 },
] as const;
const CLUE_COUNT = CLUE_POSITIONS.length;

const INSET = 16; // matches the diagram's inset-4
const LENS = 124; // lens diameter in px; keep in sync with .lens-mask in globals.css
const REACH = 14; // how far past an element's edge the lens still "touches" it
const NODE_HALF = { w: 88, h: 24 }; // compact diagram node card

// Rough chip size from its text (11px mono ≈ 6.6px per char, plus icon and padding).
const clueHalfWidth = (text: string) => (text.length * 6.6 + 34) / 2;

// A clue is only "found" once the lens has passed over its whole width:
// the chip is split into sample points and every one must fall inside the lens.
const SAMPLE_STEP = 20;
const SEEN_RADIUS = LENS / 2 - 10;
const sampleOffsets = (text: string) => {
  const half = clueHalfWidth(text) - 6;
  const count = Math.max(2, Math.ceil((half * 2) / SAMPLE_STEP) + 1);
  return Array.from({ length: count }, (_, i) => -half + (i * half * 2) / (count - 1));
};

function ClueChip({ text, found, hovered }: { text: string; found: boolean; hovered: boolean }) {
  return (
    <span
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 font-mono text-[11px] shadow-lg transition-all duration-150 ${
        hovered
          ? "scale-110 border-accent bg-accent/15 text-fg shadow-[0_0_24px_rgb(154_168_255/0.35)]"
          : found
            ? "border-accent/50 bg-surface text-accent"
            : "border-accent/40 bg-bg/90 text-accent/90"
      }`}
    >
      {found ? <Check className="size-3" strokeWidth={3} /> : <Search className="size-3" />}
      {text}
    </span>
  );
}

export function LandingPreview({ incident }: { incident: Incident }) {
  const t = useT();
  const href = useLocalePath();
  const CLUES = CLUE_POSITIONS.map((c) => ({ ...c, text: t.preview.clues[c.id] }));
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [found, setFound] = useState<string[]>([]);
  const [hoverClue, setHoverClue] = useState<string | null>(null);
  const [hoverNode, setHoverNode] = useState<string | null>(null);
  // Sample points already seen per clue; a ref so scanning doesn't re-render.
  const seen = useRef<Record<string, Set<number>>>({});
  const allFound = found.length === CLUE_COUNT;

  const rds = incident.resources.find((r) => r.id === "rds")!;
  const connections = rds.metrics[0];

  const track = (e: React.PointerEvent) => {
    const el = box.current;
    // Case solved: the lens is put away and the preview behaves like a normal image.
    if (!el || allFound) return;
    const rect = el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    // Set CSS vars directly so moving the lens doesn't re-render the diagram.
    el.style.setProperty("--lx", `${px}px`);
    el.style.setProperty("--ly", `${py}px`);
    if (!active) setActive(true);

    const w = rect.width - INSET * 2;
    const h = rect.height - INSET * 2;
    const touches = (x: number, y: number, halfW: number, halfH: number) =>
      Math.abs(px - (INSET + (x / 100) * w)) < halfW + REACH && Math.abs(py - (INSET + (y / 100) * h)) < halfH + REACH;

    const clue = CLUES.find((c) => touches(c.x, c.y, clueHalfWidth(c.text), 12))?.id ?? null;
    const node = clue ? null : (incident.resources.find((r) => touches(r.x, r.y, NODE_HALF.w, NODE_HALF.h))?.id ?? null);
    if (clue !== hoverClue) setHoverClue(clue);
    if (node !== hoverNode) setHoverNode(node);

    const completed: string[] = [];
    for (const c of CLUES) {
      if (found.includes(c.id)) continue;
      const cx = INSET + (c.x / 100) * w;
      const cy = INSET + (c.y / 100) * h;
      const offsets = sampleOffsets(c.text);
      const points = (seen.current[c.id] ??= new Set());
      offsets.forEach((dx, i) => {
        if (Math.hypot(px - (cx + dx), py - cy) < SEEN_RADIUS) points.add(i);
      });
      if (points.size === offsets.length) completed.push(c.id);
    }
    if (completed.length) {
      setFound([...found, ...completed]);
      if (found.length + completed.length === CLUE_COUNT) {
        setHoverClue(null);
        setHoverNode(null);
      }
    }
  };

  const leave = () => {
    box.current?.style.removeProperty("--lx");
    box.current?.style.removeProperty("--ly");
    setActive(false);
    setHoverClue(null);
    setHoverNode(null);
  };

  return (
    <div className="relative mx-auto mt-16 w-full max-w-5xl">
      <div className="absolute -inset-x-10 -top-10 bottom-0 bg-[radial-gradient(ellipse_at_top,rgb(154_168_255/0.10),transparent_60%)]" />
      <div className="relative overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-[0_40px_120px_-40px_rgb(0_0_0/0.9)]">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Logo size={18} />
          <span className="h-4 w-px bg-line-strong" />
          <StatusDot status="critical" pulse />
          <span className="text-[13px] font-medium">{incident.title}</span>
          {allFound ? (
            <motion.span initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="ml-auto hidden lg:block">
              <Link
                href={href(`/incident/${incident.id}`)}
                className="group flex items-center gap-2 text-[12.5px] text-fg/90 hover:text-fg"
              >
                {t.preview.done}
                <span className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-bg">
                  {t.preview.openCase}
                  <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            </motion.span>
          ) : (
            <span className="ml-auto hidden items-center gap-1.5 font-mono text-[12px] tabular-nums text-muted lg:flex">
              <Search className="size-3.5" />
              {t.preview.cluesSpotted}
              <motion.span key={found.length} initial={{ scale: 1.6, color: "#9aa8ff" }} animate={{ scale: 1, color: "#e8eaf0" }}>
                {found.length}/{CLUE_COUNT}
              </motion.span>
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-[minmax(0,1fr)_280px]">
          <div
            ref={box}
            onPointerMove={track}
            onPointerDown={track}
            onPointerLeave={leave}
            className={`relative h-[340px] sm:h-[380px] ${allFound ? "" : "lg:cursor-none"} ${active || allFound ? "" : "lens-idle"}`}
          >
            <div className="grid-dots absolute inset-0" />
            <div className="absolute inset-4">
              <ArchitectureDiagram incident={incident} highlighted={hoverNode} compact />
            </div>

            {/* Lens and clues: only where the diagram fits without scrolling. */}
            <div className="pointer-events-none absolute inset-0 hidden lg:block">
              <div className="lens-mask absolute inset-0">
                <div className="absolute inset-4">
                  {CLUES.filter((c) => !found.includes(c.id)).map((c) => (
                    <span key={c.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${c.x}%`, top: `${c.y}%` }}>
                      <ClueChip text={c.text} found={false} hovered={hoverClue === c.id} />
                    </span>
                  ))}
                </div>
              </div>
              <div className="absolute inset-4">
                {CLUES.filter((c) => found.includes(c.id)).map((c) => (
                  <motion.span
                    key={c.id}
                    initial={{ scale: 1.25, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${c.x}%`, top: `${c.y}%` }}
                  >
                    <ClueChip text={c.text} found hovered={hoverClue === c.id} />
                  </motion.span>
                ))}
              </div>
              <AnimatePresence>
                {!allFound && (
                  <motion.div
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.35, ease: "easeIn" }}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: "var(--lx)", top: "var(--ly)", width: LENS, height: LENS }}
                  >
                    <div
                      className={`absolute inset-0 rounded-full border-2 transition-all duration-150 ${
                        hoverClue || hoverNode
                          ? "scale-105 border-accent bg-accent/[0.06] shadow-[inset_0_0_30px_rgb(154_168_255/0.22),0_0_24px_rgb(154_168_255/0.25)]"
                          : "border-accent/60 bg-accent/[0.03] shadow-[inset_0_0_30px_rgb(154_168_255/0.12)]"
                      }`}
                    />
                    <div
                      className={`absolute left-[calc(50%+42px)] top-[calc(50%+42px)] h-9 w-2 origin-top -rotate-45 rounded-full transition-colors duration-150 ${
                        hoverClue || hoverNode ? "bg-accent" : "bg-accent/60"
                      }`}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {!allFound && (
                <motion.div
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute left-4 top-3 hidden items-center gap-1.5 text-[12px] text-muted lg:flex"
                >
                  <Search className="size-3.5 text-accent" />
                  {t.preview.hint}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden space-y-3 border-l border-line p-4 md:block">
            <div className="text-[11px] uppercase tracking-[0.12em] text-muted">{rds.service}</div>
            <div className="text-sm font-semibold">{rds.name}</div>
            <div className="rounded-lg border border-line bg-raised/60 p-3">
              <div className="text-[11px] text-muted">{connections.label}</div>
              <div className={`mt-1 font-mono text-lg ${STATUS_TEXT[connections.status]}`}>{connections.value}</div>
              <div className="mt-3">
                <CapacityBar value={connections.bar!.value} max={connections.bar!.max} status={connections.status} />
              </div>
            </div>
            <div className="rounded-lg border border-line p-3 text-[12.5px] leading-relaxed text-fg/80">
              <div className="mb-1 text-[10px] uppercase tracking-[0.12em] text-accent">{t.preview.observationLabel}</div>
              {t.preview.observation}
            </div>
            <ul className="space-y-1.5 pt-1 text-[12px]">
              {incident.evidence.slice(0, 3).map((e) => (
                <li key={e.id} className="flex gap-2">
                  <Check className="mt-0.5 size-3 shrink-0 text-accent" strokeWidth={3} />
                  {e.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
