import type { Incident, Resource } from "./types";
import type { Lang } from "./i18n";

export interface AssistantRequest {
  incidentId: string;
  question: string;
  evidence: string[];
  inspected: string[];
  lang?: Lang;
  history?: { role: "user" | "assistant"; text: string }[];
}

// Keywords are matched against the question with accents stripped, so they
// are written without accents too. English and Spanish share each list.
const RESOURCE_KEYWORDS: Record<Resource["kind"], string[]> = {
  alb: ["alb", "load balancer", "balancer", "balanceador"],
  lambda: ["lambda", "function", "funcion", "worker", "workers"],
  rds: ["rds", "database", "db", "postgres", "dynamodb", "table", "base de datos", "bd", "tabla"],
  sqs: ["sqs", "queue", "backlog", "dlq", "dead-letter", "cola"],
  deploy: ["deploy", "deployment", "diff", "release", "despliegue"],
  api: ["api gateway", "intake", "producer", "productor"],
  github: ["github", "workflow", "actions", "pipeline"],
  oidc: ["oidc", "token", "claim", "claims", "sub"],
  sts: ["sts", "cloudtrail", "assumerole", "assume"],
  iam: ["iam", "role", "trust", "policy", "rol", "politica"],
  ecs: ["ecs", "service", "production", "task", "tasks", "fleet", "servicio", "produccion", "tarea", "tareas", "flota"],
  dns: ["dns", "route 53", "route53", "record", "weighted", "weight", "registro", "peso", "pesos"],
  cdn: ["cloudfront", "cdn", "edge", "cache", "borde"],
  events: ["eventbridge", "schedule", "scheduler", "cron", "nightly", "nocturno"],
  secrets: ["secret", "secrets", "rotation", "rotate", "password", "credentials", "secreto", "rotacion", "contrasena", "credenciales"],
  kms: ["kms", "key policy", "decrypt", "clave"],
  scaling: ["autoscaling", "auto scaling", "scale", "scaling", "escalado"],
};

const INTENTS = {
  rootCause: ["root cause", "cause", "why is it broken", "answer", "culprit", "likely", "hypothesis", "causa", "culpable", "respuesta", "hipotesis", "probable"],
  changed: ["changed", "change", "recent", "recently", "deploy", "deployment", "cambio", "cambios", "reciente", "recientemente", "despliegue"],
  next: ["next", "investigate", "where", "look", "start", "check", "siguiente", "investigar", "donde", "mirar", "revisar", "empezar"],
  meaning: ["mean", "means", "meaning", "what does", "what is a", "explain", "metric", "significa", "que es un", "que es una", "que hace", "explica", "metrica"],
};

const COPY = {
  en: {
    allInspected: "You've inspected every signal on the diagram. Build your hypothesis when you're ready.",
    revisit: "Revisit the timeline and connect the events to the resources you've inspected.",
    open: (name: string) => `Open ${name} on the diagram.`,
    openMore: (name: string) => `Open ${name} on the diagram — I'll be able to say more once we've looked at its metrics.`,
  },
  es: {
    allInspected: "Ya inspeccionaste todas las señales del diagrama. Arma tu hipótesis cuando quieras.",
    revisit: "Vuelve a la línea de tiempo y conecta los eventos con los recursos que inspeccionaste.",
    open: (name: string) => `Abre ${name} en el diagrama.`,
    openMore: (name: string) => `Abre ${name} en el diagrama — podré decirte más cuando veamos sus métricas.`,
  },
};

const normalize = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// Unicode-aware word boundaries (\b only understands ASCII letters).
const has = (text: string, words: string[]) =>
  words.some((w) => new RegExp(`(?<![\\p{L}\\p{N}])${w}(?![\\p{L}\\p{N}])`, "u").test(text));

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

/**
 * Deterministic assistant used when the AI provider is unavailable.
 * `incident` must already be localized to `req.lang`.
 */
export function fallbackAnswer(incident: Incident, req: Omit<AssistantRequest, "incidentId">) {
  const copy = COPY[req.lang ?? "en"];
  const q = normalize(req.question);
  const f = incident.fallback;
  const reveal = canRevealRootCause(incident, req.evidence);
  const about = (resource: Resource) =>
    req.inspected.includes(resource.id) ? resource.observation : copy.openMore(resource.name);

  if (has(q, INTENTS.rootCause)) {
    return reveal ? f.rootCause : f.earlyRootCause;
  }
  const named = incident.resources.find((r) => q.includes(r.name.toLowerCase()));
  if (named) return about(named);
  if (has(q, INTENTS.changed)) {
    return f.whatChanged;
  }
  if (has(q, INTENTS.next)) {
    const next = nextResource(incident, req.evidence, req.inspected);
    if (!next) return reveal ? copy.allInspected : copy.revisit;
    return f.nextStepByResource[next.id] ?? copy.open(next.name);
  }
  if (has(q, INTENTS.meaning)) {
    return f.metrics;
  }
  const mentioned = incident.resources.find((r) => has(q, RESOURCE_KEYWORDS[r.kind]));
  if (mentioned) return about(mentioned);
  return f.whatsHappening;
}

function describeResource(r: Resource, inspected: boolean) {
  const metrics = r.metrics.map((m) => `${m.label}: ${m.value} (${m.status})`).join("; ");
  const base = `- ${r.name} [${r.service}] status=${r.status}. ${metrics}`;
  if (!inspected) return `${base}. (Not inspected yet.)`;
  const details = r.details ? `\n  ${r.details.title}:\n  ${r.details.lines.join("\n  ")}` : "";
  return `${base}. Inspected.${details}`;
}

/** `incident` must already be localized to `req.lang`. */
export function buildSystemPrompt(incident: Incident, req: AssistantRequest) {
  const reveal = canRevealRootCause(incident, req.evidence);
  const collected = incident.evidence.filter((e) => req.evidence.includes(e.id));
  const language = req.lang === "es" ? "Spanish" : "English";

  const lines = [
    "You are the investigation assistant inside Cloud Detective, a training game where the user investigates a simulated AWS production incident.",
    "Act like a calm senior SRE pairing with the user: explain signals, point to what to inspect next, and help them reason. Never invent metrics, logs or resources that are not in the context below.",
    "Reply in plain text, 2-4 short sentences, under 90 words. No markdown, no lists, no headings.",
    `The interface is in ${language}: reply in ${language} unless the user clearly writes in another language.`,
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

  if (reveal && incident.suspects) {
    // Harder cases: the player has to name the root cause themselves, so the
    // prompt never contains it.
    lines.push(
      "The user has enough evidence, but in this case they must identify the root cause themselves. Never name or confirm a root cause.",
      "Help them reason: point out which signals to compare (timestamps, percentages, which components differ) and ask one guiding question.",
    );
  } else if (reveal) {
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
