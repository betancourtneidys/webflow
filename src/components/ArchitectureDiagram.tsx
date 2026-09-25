"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import type { Edge, Incident, Resource } from "@/lib/types";
import { KindIcon, STATUS_COLOR, StatusDot } from "./ui";

interface Props {
  incident: Incident;
  selected?: string | null;
  highlighted?: string | null;
  inspected?: string[];
  onSelect?: (id: string) => void;
  compact?: boolean;
}

function edgePath(a: Resource, b: Resource) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) < 1 || Math.abs(dy) < 1) return `M${a.x},${a.y} L${b.x},${b.y}`;
  if (Math.abs(dy) >= Math.abs(dx) * 0.6) {
    const my = (a.y + b.y) / 2;
    return `M${a.x},${a.y} C${a.x},${my} ${b.x},${my} ${b.x},${b.y}`;
  }
  const mx = (a.x + b.x) / 2;
  return `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
}

function EdgeLine({ edge, from, to, active }: { edge: Edge; from: Resource; to: Resource; active: boolean }) {
  const d = edgePath(from, to);
  const color = edge.status === "neutral" || edge.status === "healthy" ? "var(--color-muted)" : STATUS_COLOR[edge.status];
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="rgb(255 255 255 / 0.09)"
        strokeWidth={active ? 2 : 1.5}
        strokeDasharray={edge.dashed ? "4 5" : undefined}
        vectorEffect="non-scaling-stroke"
      />
      {!edge.dashed && (
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeOpacity={active ? 1 : 0.75}
          strokeWidth={active ? 2.25 : 1.75}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className={edge.status === "critical" ? "edge-flow-slow" : "edge-flow"}
        />
      )}
    </g>
  );
}

export function ArchitectureDiagram({ incident, selected, highlighted, inspected = [], onSelect, compact }: Props) {
  const byId = new Map(incident.resources.map((r) => [r.id, r]));
  const focus = selected ?? highlighted;
  const scroller = useRef<HTMLDivElement>(null);

  // On narrow screens the canvas scrolls horizontally; start centered.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []);

  return (
    <div ref={scroller} className="scrollbar-thin h-full w-full overflow-x-auto overflow-y-hidden">
      <div className={`relative h-full ${compact ? "min-w-[600px]" : "min-w-[720px]"}`}>
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {incident.edges.map((edge) => {
            const from = byId.get(edge.from);
            const to = byId.get(edge.to);
            if (!from || !to) return null;
            const active = !!focus && (edge.from === focus || edge.to === focus);
            return <EdgeLine key={`${edge.from}-${edge.to}`} edge={edge} from={from} to={to} active={active} />;
          })}
        </svg>

        {incident.resources.map((r, i) => {
          const isSelected = selected === r.id;
          const isHighlighted = highlighted === r.id && !isSelected;
          const done = inspected.includes(r.id);
          return (
            <motion.button
              key={r.id}
              type="button"
              disabled={!onSelect}
              onClick={() => onSelect?.(r.id)}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: isSelected ? 1.04 : isHighlighted ? 1.03 : 1 }}
              transition={{ delay: 0.08 * i, type: "spring", stiffness: 320, damping: 26 }}
              style={{ left: `${r.x}%`, top: `${r.y}%` }}
              className={`group absolute -translate-x-1/2 -translate-y-1/2 text-left outline-none ${onSelect ? "cursor-pointer" : "cursor-default"}`}
              aria-label={`Inspect ${r.name}`}
            >
              <div
                className={[
                  "relative flex items-center gap-2.5 rounded-xl border bg-surface/95 backdrop-blur transition-all duration-200",
                  compact ? "w-[176px] p-2" : "w-[192px] p-2.5",
                  isSelected
                    ? "border-accent/70 shadow-[0_0_0_4px_rgb(154_168_255/0.12),0_12px_40px_-12px_rgb(0_0_0/0.8)]"
                    : isHighlighted
                      ? "border-accent/70 bg-raised shadow-[0_0_0_4px_rgb(154_168_255/0.14),0_0_28px_-4px_rgb(154_168_255/0.35)]"
                      : "border-line-strong group-hover:border-white/25 group-focus-visible:border-accent/60",
                ].join(" ")}
              >
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-lg border border-line"
                  style={{
                    background: `color-mix(in oklab, ${STATUS_COLOR[r.status]} ${r.status === "healthy" || r.status === "neutral" ? 6 : 14}%, transparent)`,
                    color: r.status === "healthy" || r.status === "neutral" ? "var(--color-fg)" : STATUS_COLOR[r.status],
                  }}
                >
                  <KindIcon kind={r.kind} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium leading-tight">{r.name}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted">{r.service}</span>
                </span>
                <StatusDot status={r.status} pulse={r.status === "critical"} />
                {done && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-accent text-bg"
                  >
                    <Check className="size-2.5" strokeWidth={3.5} />
                  </motion.span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
