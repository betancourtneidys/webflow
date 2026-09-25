export type Status = "critical" | "warning" | "healthy" | "neutral";

export type ResourceKind =
  | "alb"
  | "lambda"
  | "rds"
  | "sqs"
  | "deploy"
  | "api"
  | "github"
  | "oidc"
  | "sts"
  | "iam"
  | "ecs";

export interface Metric {
  label: string;
  value: string;
  status: Status;
  /** Optional trend, rendered as a sparkline. Values are relative, last point = "now". */
  series?: number[];
  /** Optional capacity bar (e.g. connections used / max). */
  bar?: { value: number; max: number };
  caption?: string;
}

export interface Resource {
  id: string;
  kind: ResourceKind;
  name: string;
  service: string;
  status: Status;
  /** Position in the diagram, in percent of the canvas (0-100). */
  x: number;
  y: number;
  metrics: Metric[];
  /** Log lines, config snippets or claims shown in a monospace block. */
  details?: { title: string; lines: string[] };
  /** Assistant observation shown under the metrics. Authored per scenario. */
  observation: string;
  /** Evidence this resource reveals when inspected. */
  evidence?: string;
}

export interface Edge {
  from: string;
  to: string;
  status: Status;
  dashed?: boolean;
}

export interface Evidence {
  id: string;
  label: string;
  /** Short fact passed to the assistant as context. */
  fact: string;
  /** False for red herrings: they count as evidence but explain a symptom, not the cause. */
  causal: boolean;
}

export interface TimelineEvent {
  time: string;
  title: string;
  detail: string;
  resource: string;
  status: Status;
}

export interface ResolutionOption {
  id: string;
  label: string;
  detail: string;
  correct: boolean;
  feedback: string;
}

export interface Incident {
  id: string;
  emoji: string;
  title: string;
  short: string;
  pattern: string;
  severity: "critical" | "high";
  /** 1 Rookie · 2 Detective · 3 Inspector */
  difficulty: 1 | 2 | 3;
  startedAt: string;
  startedAgo: string;
  summary: string;
  headline: Metric[];
  resources: Resource[];
  edges: Edge[];
  evidence: Evidence[];
  /** Evidence needed before the hypothesis can be built. */
  minEvidence: number;
  timeline: TimelineEvent[];
  rootCause: {
    title: string;
    hypothesis: string;
    chain: string[];
    confidence: "High" | "Medium";
  };
  question: string;
  options: ResolutionOption[];
  lesson: string;
  /** Deterministic assistant answers used when the AI provider is unavailable. */
  fallback: {
    whatsHappening: string;
    nextStepByResource: Record<string, string>;
    whatChanged: string;
    metrics: string;
    earlyRootCause: string;
    rootCause: string;
  };
  suggestedQuestions: string[];
}
