export type Lang = "en" | "es";
export const LANGS: Lang[] = ["en", "es"];

/** English lives at the root, Spanish under /es. */
export function localePath(lang: Lang, path: string) {
  if (lang === "en") return path;
  return path === "/" ? "/es" : `/es${path}`;
}

/** The same page in the other language. */
export function switchLocalePath(pathname: string, to: Lang) {
  const bare = pathname.replace(/^\/es(?=\/|$)/, "") || "/";
  return localePath(to, bare);
}

const en = {
  nav: {
    incidents: "Incidents",
    start: "Start investigating",
  },
  sim: {
    chip: "Game day",
    tooltip: "Game day: a practice drill. The systems, metrics and logs are fictional — no real customers are affected.",
    drillLine: "This is a drill: simulated AWS incidents, no real systems, no account needed.",
    briefNote: "This is a drill · fictional systems and data",
    listHeader: (n: number) => `Game day · ${n} drills ready`,
  },
  severity: { critical: "critical", high: "high" },
  status: { critical: "Critical", warning: "Degraded", healthy: "Healthy", neutral: "Info" },
  ranks: { 1: "Rookie", 2: "Detective", 3: "Inspector", 4: "Chief" },
  stamp: { solved: "Solved", unsolved: "Unsolved", best: (time: string) => `best ${time}` },
  landing: {
    openBadge: (n: number) => `${n} production incidents open`,
    titleA: "Production is",
    titleBroken: "broken.",
    titleB: "Find out why.",
    subtitle: "Investigate cloud incidents, connect the evidence and uncover the root cause.",
    ctaPrimary: "Investigate an incident",
    ctaSecondary: "Browse incidents",
    loopTitle: "Incident response shouldn't be just dashboards.",
    loopText: "Dashboards tell you something is red. Investigation tells you why. Cloud Detective trains the second part.",
    steps: [
      { title: "Observe", text: "An alert fires. You see the blast radius, not the reason." },
      { title: "Investigate", text: "Inspect resources, read logs and follow the timeline." },
      { title: "Understand", text: "Connect the evidence into a causal chain." },
      { title: "Resolve", text: "Choose the fix that removes the cause, not the symptom." },
    ],
    patternsTitle: "Built around real cloud failure patterns",
    patternsText: "The kind of incidents that page you at 3 a.m. — reproduced with realistic metrics, logs and timelines.",
    caseLabel: (n: number) => `CASE #${n}`,
    openCase: "Open case",
    finalTitle: "The pager just went off.",
    finalText: (n: number) => `${n} incidents are waiting. The clock starts when you click.`,
    finalCta: "Start investigation",
    footerLeft: "Cloud Detective · built for Nerdearla App Showcase",
    footerRight: "Simulated incidents. No AWS account needed.",
  },
  preview: {
    cluesSpotted: "Clues spotted",
    done: "Sharp eye. Now find the root cause.",
    openCase: "Open case",
    hint: "Move the lens over the system to find clues",
    observationLabel: "Assistant observation",
    observation: "Database connections are approaching the configured limit.",
    clues: {
      deploy: "createPool() moved into handler",
      alb: "p99 4.8s · traffic flat",
      lambda: "ERROR too many connections",
      rds: "487 / 500 connections",
      sqs: "backlog is a symptom",
    },
  },
  quotes: [
    "It's not DNS. There's no way it's DNS. It was DNS.",
    "Nobody changed anything. Somebody changed something.",
    "The dashboard is green. The customers disagree.",
    "Works on my machine. Your machine is not production.",
    "Deploying on a Friday at 5 p.m.? Bold.",
  ],
  list: {
    title: "Pick an incident to investigate",
    subtitle: "Each one is a real cloud failure pattern with simulated data. No AWS account needed.",
    started: (ago: string) => `started ${ago}`,
    resources: (n: number) => `${n} resources`,
    investigate: "Investigate",
  },
  brief: {
    allIncidents: "All incidents",
    incident: "Incident",
    started: (ago: string, at: string) => `Started ${ago} · ${at}`,
    investigate: "INVESTIGATE INCIDENT",
    pressEnter: "Press Enter to start · the clock starts now",
  },
  ws: {
    home: "Cloud Detective home",
    assistant: "Assistant",
    buildHypothesis: "Build hypothesis",
    buildHypothesisCaps: "BUILD HYPOTHESIS",
    severity: "Severity",
    started: "Started",
    investigation: "Investigation",
    evidence: "Evidence",
    undiscovered: "Undiscovered signal",
    ready: "You have enough evidence to form a hypothesis.",
    collectMore: (n: number) =>
      n === 1 ? "Collect 1 more piece of evidence to form a hypothesis." : `Collect ${n} more pieces of evidence to form a hypothesis.`,
    architecture: "Architecture",
    clickHint: "Click a resource to inspect it",
    timeline: "Timeline",
    timelineHint: "Select an event to jump to its resource",
    inspector: "Inspector",
    nothingSelected: "Nothing selected",
    nothingSelectedText: "Pick a resource on the diagram or an event on the timeline to see its metrics and logs.",
    closePanel: "Close panel",
    welcome:
      "I'm following this incident with you. Click any resource on the diagram to inspect it — I'll help you connect what you find.",
  },
  resource: {
    evidenceCollected: "Evidence collected",
    observation: "Assistant observation",
    askAbout: (name: string) => `Ask the assistant about ${name}`,
    askQuestion: (name: string) => `Why is ${name} relevant?`,
    inspect: (name: string) => `Inspect ${name}`,
  },
  assistant: {
    title: "Investigation assistant",
    description: "Sees the signals you've inspected. It won't name a root cause until the evidence supports one.",
    thinking: "Correlating signals…",
    placeholder: "Ask about this incident…",
    send: "Send",
  },
  hypothesis: {
    steps: { suspect: "Suspect", hypothesis: "Hypothesis", action: "Resolution" },
    suspectTitle: "Which explanation fits the evidence?",
    suspectText: "Several things look suspicious. Only one explains every signal.",
    likely: "Likely root cause",
    confirmed: "Root cause confirmed",
    confidence: "Confidence",
    confidenceLevel: { High: "High", Medium: "Medium" },
    chain: "Causal chain",
    decide: "Decide the fix",
    fixText: "Pick the change that fixes the root cause, not just the symptom.",
    back: "← Back to hypothesis",
    close: "Close",
  },
  resolved: {
    title: "🎉 Incident resolved",
    identified: "Root cause identified",
    time: "Investigation time",
    evidence: "Evidence collected",
    attempts: "Attempts",
    firstSolve: "Case closed · first solve",
    newBest: "New personal best",
    takeaway: "Takeaway",
    next: "NEXT INCIDENT",
    replay: "Replay",
  },
  meta: {
    title: "Cloud Detective — Production is broken. Find out why.",
    description: "Investigate simulated AWS production incidents, connect the evidence and uncover the root cause.",
    incidents: "Open incidents · Cloud Detective",
    incident: (title: string) => `${title} · Cloud Detective`,
  },
};

export type Messages = typeof en;

const es: Messages = {
  nav: {
    incidents: "Incidentes",
    start: "Empezar a investigar",
  },
  sim: {
    chip: "Simulacro",
    tooltip: "Simulacro: un ejercicio de práctica. Los sistemas, métricas y logs son ficticios — ningún cliente real se ve afectado.",
    drillLine: "Esto es un simulacro: incidentes de AWS simulados, sin sistemas reales y sin cuenta.",
    briefNote: "Esto es un simulacro · sistemas y datos ficticios",
    listHeader: (n: number) => `Simulacro · ${n} casos listos`,
  },
  severity: { critical: "crítico", high: "alto" },
  status: { critical: "Crítico", warning: "Degradado", healthy: "Sano", neutral: "Info" },
  ranks: { 1: "Novato", 2: "Detective", 3: "Inspector", 4: "Comisario" },
  stamp: { solved: "Resuelto", unsolved: "Sin resolver", best: (time: string) => `récord ${time}` },
  landing: {
    openBadge: (n: number) => `${n} incidentes de producción abiertos`,
    titleA: "Producción está",
    titleBroken: "caída.",
    titleB: "Descubre por qué.",
    subtitle: "Investiga incidentes cloud, conecta la evidencia y encuentra la causa raíz.",
    ctaPrimary: "Investigar un incidente",
    ctaSecondary: "Ver incidentes",
    loopTitle: "Responder a incidentes no debería ser solo mirar dashboards.",
    loopText: "Los dashboards te dicen que algo está en rojo. La investigación te dice por qué. Cloud Detective entrena lo segundo.",
    steps: [
      { title: "Observar", text: "Salta una alerta. Ves el impacto, no el motivo." },
      { title: "Investigar", text: "Inspecciona recursos, lee logs y sigue la línea de tiempo." },
      { title: "Entender", text: "Conecta la evidencia en una cadena causal." },
      { title: "Resolver", text: "Elige el arreglo que elimina la causa, no el síntoma." },
    ],
    patternsTitle: "Basado en fallas reales de la nube",
    patternsText: "El tipo de incidentes que te despiertan a las 3 a.m. — reproducidos con métricas, logs y líneas de tiempo realistas.",
    caseLabel: (n: number) => `CASO #${n}`,
    openCase: "Abrir caso",
    finalTitle: "Acaba de sonar el pager.",
    finalText: (n: number) => `${n} incidentes te esperan. El reloj arranca cuando hagas clic.`,
    finalCta: "Empezar la investigación",
    footerLeft: "Cloud Detective · hecho para Nerdearla App Showcase",
    footerRight: "Incidentes simulados. No hace falta cuenta de AWS.",
  },
  preview: {
    cluesSpotted: "Pistas encontradas",
    done: "Buen ojo. Ahora encuentra la causa raíz.",
    openCase: "Abrir caso",
    hint: "Pasa la lupa por el sistema para encontrar pistas",
    observationLabel: "Observación del asistente",
    observation: "Las conexiones a la base de datos se acercan al límite configurado.",
    clues: {
      deploy: "createPool() movido al handler",
      alb: "p99 4.8s · tráfico estable",
      lambda: "ERROR too many connections",
      rds: "487 / 500 conexiones",
      sqs: "el backlog es un síntoma",
    },
  },
  quotes: [
    "No es DNS. No puede ser DNS. Era DNS.",
    "Nadie cambió nada. Alguien cambió algo.",
    "El dashboard está en verde. Los clientes no opinan lo mismo.",
    "En mi máquina funciona. Tu máquina no es producción.",
    "¿Deploy un viernes a las 5 p.m.? Valiente.",
  ],
  list: {
    title: "Elige un incidente para investigar",
    subtitle: "Cada uno es un patrón de falla real con datos simulados. No hace falta cuenta de AWS.",
    started: (ago: string) => `comenzó ${ago}`,
    resources: (n: number) => `${n} recursos`,
    investigate: "Investigar",
  },
  brief: {
    allIncidents: "Todos los incidentes",
    incident: "Incidente",
    started: (ago: string, at: string) => `Comenzó ${ago} · ${at}`,
    investigate: "INVESTIGAR INCIDENTE",
    pressEnter: "Presiona Enter para empezar · el reloj arranca ya",
  },
  ws: {
    home: "Inicio de Cloud Detective",
    assistant: "Asistente",
    buildHypothesis: "Armar hipótesis",
    buildHypothesisCaps: "ARMAR HIPÓTESIS",
    severity: "Severidad",
    started: "Inicio",
    investigation: "Investigación",
    evidence: "Evidencia",
    undiscovered: "Señal sin descubrir",
    ready: "Tienes evidencia suficiente para armar una hipótesis.",
    collectMore: (n: number) =>
      n === 1 ? "Reúne 1 evidencia más para armar una hipótesis." : `Reúne ${n} evidencias más para armar una hipótesis.`,
    architecture: "Arquitectura",
    clickHint: "Haz clic en un recurso para inspeccionarlo",
    timeline: "Línea de tiempo",
    timelineHint: "Elige un evento para ir a su recurso",
    inspector: "Inspector",
    nothingSelected: "Nada seleccionado",
    nothingSelectedText: "Elige un recurso en el diagrama o un evento en la línea de tiempo para ver sus métricas y logs.",
    closePanel: "Cerrar panel",
    welcome:
      "Sigo este incidente contigo. Haz clic en cualquier recurso del diagrama para inspeccionarlo — te ayudo a conectar lo que encuentres.",
  },
  resource: {
    evidenceCollected: "Evidencia reunida",
    observation: "Observación del asistente",
    askAbout: (name: string) => `Preguntar al asistente sobre ${name}`,
    askQuestion: (name: string) => `¿Por qué es relevante ${name}?`,
    inspect: (name: string) => `Inspeccionar ${name}`,
  },
  assistant: {
    title: "Asistente de investigación",
    description: "Ve las señales que inspeccionaste. No nombrará una causa raíz hasta que la evidencia la respalde.",
    thinking: "Correlacionando señales…",
    placeholder: "Pregunta sobre este incidente…",
    send: "Enviar",
  },
  hypothesis: {
    steps: { suspect: "Sospechoso", hypothesis: "Hipótesis", action: "Resolución" },
    suspectTitle: "¿Qué explicación encaja con la evidencia?",
    suspectText: "Varias cosas parecen sospechosas. Solo una explica todas las señales.",
    likely: "Causa raíz probable",
    confirmed: "Causa raíz confirmada",
    confidence: "Confianza",
    confidenceLevel: { High: "Alta", Medium: "Media" },
    chain: "Cadena causal",
    decide: "Decidir el arreglo",
    fixText: "Elige el cambio que arregla la causa raíz, no solo el síntoma.",
    back: "← Volver a la hipótesis",
    close: "Cerrar",
  },
  resolved: {
    title: "🎉 Incidente resuelto",
    identified: "Causa raíz identificada",
    time: "Tiempo de investigación",
    evidence: "Evidencia reunida",
    attempts: "Intentos",
    firstSolve: "Caso cerrado · primera vez",
    newBest: "Nuevo récord personal",
    takeaway: "Aprendizaje",
    next: "SIGUIENTE INCIDENTE",
    replay: "Repetir",
  },
  meta: {
    title: "Cloud Detective — Producción está caída. Descubre por qué.",
    description: "Investiga incidentes simulados de producción en AWS, conecta la evidencia y encuentra la causa raíz.",
    incidents: "Incidentes abiertos · Cloud Detective",
    incident: (title: string) => `${title} · Cloud Detective`,
  },
};

const MESSAGES: Record<Lang, Messages> = { en, es };

export function getMessages(lang: Lang): Messages {
  return MESSAGES[lang];
}

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "es";
}
