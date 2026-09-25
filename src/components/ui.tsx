import {
  Boxes,
  CalendarClock,
  Gamepad2,
  Database,
  GitBranch,
  GitCommitHorizontal,
  Globe,
  Key,
  KeyRound,
  Layers,
  LockKeyhole,
  Network,
  RadioTower,
  ScrollText,
  ShieldCheck,
  Signpost,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ResourceKind, Status } from "@/lib/types";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M9 23.5h-.5a5.5 5.5 0 0 1-.9-10.93A7.5 7.5 0 0 1 22.2 10.6 5.5 5.5 0 0 1 26 20.3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16.5" cy="20.5" r="4.25" stroke="var(--color-accent)" strokeWidth="2" />
      <path d="m19.6 23.6 3.4 3.4" stroke="var(--color-accent)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5 font-semibold tracking-tight">
      <Logo />
      <span>Cloud Detective</span>
    </span>
  );
}

/**
 * Marks screens as a practice exercise so nobody mistakes them for a real
 * incident. "Game day" is what SRE teams call a planned failure drill.
 */
export function SimulationChip({ className = "" }: { className?: string }) {
  return (
    <span
      title="Game day: a practice drill. The systems, metrics and logs are fictional — no real customers are affected."
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent ${className}`}
    >
      <Gamepad2 className="size-3" strokeWidth={2} />
      Game day
    </span>
  );
}

export const STATUS_COLOR: Record<Status, string> = {
  critical: "var(--color-critical)",
  warning: "var(--color-warning)",
  healthy: "var(--color-healthy)",
  neutral: "var(--color-neutral)",
};

export const STATUS_TEXT: Record<Status, string> = {
  critical: "text-critical",
  warning: "text-warning",
  healthy: "text-fg",
  neutral: "text-fg",
};

export function StatusDot({ status, pulse = false }: { status: Status; pulse?: boolean }) {
  const color = STATUS_COLOR[status];
  return (
    <span className="relative inline-flex size-2 shrink-0">
      {pulse && <span className="pulse-ring absolute inset-0 rounded-full" style={{ background: color }} />}
      <span className="relative inline-flex size-2 rounded-full" style={{ background: color }} />
    </span>
  );
}

const KIND_ICON: Record<ResourceKind, LucideIcon> = {
  alb: Network,
  lambda: Zap,
  rds: Database,
  sqs: Layers,
  deploy: GitCommitHorizontal,
  api: Globe,
  github: GitBranch,
  oidc: KeyRound,
  sts: ScrollText,
  iam: ShieldCheck,
  ecs: Boxes,
  dns: Signpost,
  cdn: RadioTower,
  events: CalendarClock,
  secrets: LockKeyhole,
  kms: Key,
  scaling: TrendingUp,
};

export function KindIcon({ kind, className }: { kind: ResourceKind; className?: string }) {
  const Icon = KIND_ICON[kind];
  return <Icon className={className} strokeWidth={1.75} />;
}

export function Sparkline({ values, status, height = 32 }: { values: number[]; status: Status; height?: number }) {
  const width = 120;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - 3 - ((v - min) / range) * (height - 6);
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const color = status === "neutral" || status === "healthy" ? "var(--color-muted)" : STATUS_COLOR[status];
  const id = `spark-${status}`;
  const [lx, ly] = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2" fill={color} />
    </svg>
  );
}

export function CapacityBar({ value, max, status }: { value: number; max: number; status: Status }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = status === "neutral" ? "var(--color-muted)" : STATUS_COLOR[status];
  return (
    <div className="flex gap-[3px]" aria-label={`${value} of ${max}`}>
      {Array.from({ length: 20 }, (_, i) => {
        const filled = (i + 1) * 5 <= Math.round(pct / 5) * 5;
        return (
          <span
            key={i}
            className="h-2.5 flex-1 rounded-[2px] transition-colors duration-500"
            style={{ background: filled ? color : "rgb(255 255 255 / 0.07)", transitionDelay: `${i * 20}ms` }}
          />
        );
      })}
    </div>
  );
}
