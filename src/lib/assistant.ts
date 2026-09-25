import type { Incident, Resource } from "./types";

export interface AssistantRequest {
  incidentId: string;
  question: string;
  evidence: string[];
  inspected: string[];
  history?: { role: "user" | "assistant"; text: string }[];
}

const RESOURCE_KEYWORDS: Record<Resource["kind"], string[]> = {
  alb: ["alb", "load balancer", "balancer"],
  lambda: ["lambda", "function", "worker", "workers"],
  rds: ["rds", "database", "db", "postgres", "dynamodb", "table"],
  sqs: ["sqs", "queue", "backlog", "dlq", "dead-letter"],
  deploy: ["deploy", "deployment", "diff", "release"],
  api: ["api gateway", "intake", "producer"],
  github: ["github", "workflow", "actions", "pipeline"],
  oidc: ["oidc", "token", "claim", "claims", "sub"],
  sts: ["sts", "cloudtrail", "assumerole", "assume"],
  iam: ["iam", "role", "trust", "policy"],
  ecs: ["ecs", "service", "production"],
};

const has = (text: string, words: string[]) =>
  words.some((w) => new RegExp(`\\b${w}\\b`, "i").test(text));

export function canRevealRootCause(incident: Incident, evidence: string[]) {
  return evidence.length >= incident.minEvidence;
}

/** Next resource worth inspecting: causal evidence first, then the rest. */
export function nextResource(incident: Incident, evidence: string[], inspected: string[]) {
  const pending = incident.resources.filter(
    (r) => r.evidence && !evidence.includes(r.evidence) && !inspected.includes(r.id),
  );
  const causal = (r: Resource) => incident.evidence.find((e) => e.id === r.evidence)?.causal;
  return pending.find(causal) ?? pending[0];
}

/** Deterministic assistant used when the AI provider is unavailable. */
export function fallbackAnswer(incident: Incident, req: Omit<AssistantRequest, "incidentId">) {
  const q = req.question.toLowerCase();
  const f = incident.fallback;
  const reveal = canRevealRootCause(incident, req.evidence);

  if (has(q, ["root cause", "cause", "why is it broken", "answer", "culprit", "likely", "hypothesis"])) {
    return reveal ? f.rootCause : f.earlyRootCause;
  }
  const named = incident.resources.find((r) => q.includes(r.name.toLowerCase()));
  if (named) return aboutResource(named, req.inspected);
  if (has(q, ["changed", "change", "recent", "recently", "deploy", "deployment"])) {
    return f.whatChanged;
  }
  if (has(q, ["next", "investigate", "where", "look", "start", "check"])) {
    const next = nextResource(incident, req.evidence, req.inspected);
    if (!next) {
      return reveal
        ? "You've inspected every signal on the diagram. Build your hypothesis when you're ready."
        : "Revisit the timeline and connect the events to the resources you've inspected.";
    }
    return f.nextStepByResource[next.id] ?? `Open ${next.name} on the diagram.`;
  }
  if (has(q, ["mean", "means", "meaning", "what does", "explain", "metric"])) {
    return f.metrics;
  }
  const mentioned = incident.resources.find((r) => has(q, RESOURCE_KEYWORDS[r.kind]));
  if (mentioned) return aboutResource(mentioned, req.inspected);
  return f.whatsHappening;
}

function aboutResource(resource: Resource, inspected: string[]) {
  return inspected.includes(resource.id)
    ? resource.observation
    : `Open ${resource.name} on the diagram — I'll be able to say more once we've looked at its metrics.`;
}

function describeResource(r: Resource, inspected: boolean) {
  const metrics = r.metrics.map((m) => `${m.label}: ${m.value} (${m.status})`).join("; ");
  const base = `- ${r.name} [${r.service}] status=${r.status}. ${metrics}`;
  if (!inspected) return `${base}. (Not inspected yet.)`;
  const details = r.details ? `\n  ${r.details.title}:\n  ${r.details.lines.join("\n  ")}` : "";
  return `${base}. Inspected.${details}`;
}

export function buildSystemPrompt(incident: Incident, req: AssistantRequest) {
  const reveal = canRevealRootCause(incident, req.evidence);
  const collected = incident.evidence.filter((e) => req.evidence.includes(e.id));

  const lines = [
    "You are the investigation assistant inside Cloud Detective, a training game where the user investigates a simulated AWS production incident.",
    "Act like a calm senior SRE pairing with the user: explain signals, point to what to inspect next, and help them reason. Never invent metrics, logs or resources that are not in the context below.",
    "Reply in plain text, 2-4 short sentences, under 90 words. No markdown, no lists, no headings.",
    "Reply in the same language the user writes in.",
    "",
    `Incident: ${incident.title}. ${incident.summary} Started at ${incident.startedAt}.`,
    "",
    "Resources:",
    ...incident.resources.map((r) => describeResource(r, req.inspected.includes(r.id))),
    "",
    "Timeline:",
    ...incident.timeline.map((t) => `- ${t.time} ${t.title}: ${t.detail}`),
    "",
    `Evidence collected (${collected.length} of ${incident.evidence.length}, ${incident.minEvidence} needed for a hypothesis):`,
    ...(collected.length ? collected.map((e) => `- ${e.fact}`) : ["- none yet"]),
    "",
  ];

  if (reveal) {
    lines.push(
      `The user has enough evidence. If they ask about the root cause, you may confirm it: ${incident.rootCause.hypothesis}`,
      "Do not tell them which remediation option to pick; let them decide in the resolution step.",
    );
  } else {
    lines.push(
      "The user has NOT collected enough evidence yet. Do not state or guess a single root cause, even if asked directly.",
      "Instead, summarize the signals seen so far and suggest which resource on the diagram to inspect next.",
    );
  }
  return lines.join("\n");
}
