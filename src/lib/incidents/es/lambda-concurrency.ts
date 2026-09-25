import type { IncidentTranslation } from "./types";

export const lambdaConcurrencyEs: IncidentTranslation = {
  title: "API de pedidos con throttling",
  short: "Vecino ruidoso",
  pattern: "Un batch que acapara la concurrencia de Lambda de la cuenta",
  startedAgo: "hace 12 minutos",
  summary:
    "La app móvil muestra \"Algo salió mal\" en el checkout. Empezó a las 2 a.m., cuando el tráfico está en su punto más bajo del día.",
  headline: [{ label: "Tasa de error" }, { label: "Latencia p99 de la API" }, { label: "Uso de DynamoDB" }, { label: "Tráfico", value: "−60% (noche)" }],
  resources: [
    {
      id: "api",
      metrics: [{ label: "5xx" }, { label: "Latencia p99" }, { label: "Solicitudes / min" }, { label: "Throttling del stage" }],
      observation:
        "El tráfico está en su mínimo nocturno, así que los usuarios no están sobrecargando nada. API Gateway en sí no está haciendo throttling: los errores vuelven desde la integración con Lambda.",
    },
    {
      id: "deploy",
      metrics: [{ label: "Desplegado", value: "hace 3 días" }, { label: "Cambio" }, { label: "Archivos cambiados" }, { label: "Rollback", value: "disponible" }],
      observation: "Un cambio solo de configuración de hace tres días. Orders funcionó sin errores durante 72 horas después de ese despliegue.",
    },
    {
      id: "orders",
      service: "Función Lambda",
      metrics: [{ label: "Throttles" }, { label: "Errores" }, { label: "Invocaciones / min" }, { label: "Duración p95" }],
      details: { title: "Configuración" },
      observation:
        "La función no está fallando — no está corriendo. Los throttles subieron mientras los errores se mantuvieron planos: Lambda rechaza las invocaciones antes de que tu código siquiera arranque.",
    },
    {
      id: "events",
      metrics: [{ label: "Schedule" }, { label: "Primera ejecución", value: "hoy 02:00" }, { label: "Target" }, { label: "Creado", value: "ayer" }],
      observation: "El schedule se creó ayer y se disparó por primera vez a las 02:00 — un minuto antes de los errores.",
    },
    {
      id: "batch",
      service: "Función Lambda",
      metrics: [
        { label: "Concurrencia", caption: "límite de la cuenta: 1,000" },
        { label: "Invocaciones" },
        { label: "Duración" },
        { label: "Concurrencia reservada", value: "ninguna" },
      ],
      details: { title: "Resumen de la función" },
      observation:
        "El export nuevo lanza una invocación por cliente y mantiene ~950 ejecuciones concurrentes durante unos 15 minutos. No tiene tope de concurrencia.",
    },
    {
      id: "dynamo",
      service: "Tabla DynamoDB",
      metrics: [{ label: "Uso de lectura" }, { label: "Solicitudes con throttling" }, { label: "Latencia" }, { label: "Modo" }],
      observation:
        "El uso es alto porque algo está leyendo los pedidos de todos los clientes, pero hay cero solicitudes con throttling y la latencia es normal. La tabla está ocupada, no es el cuello de botella.",
    },
  ],
  evidence: [
    { id: "orders-throttles", label: "orders-api con 41k throttles, errores planos" },
    { id: "batch-concurrency", label: "report-export corre ~950 ejecuciones concurrentes" },
    { id: "new-schedule", label: "Un schedule nuevo se disparó por primera vez a las 02:00" },
    { id: "api-errors", label: "Los 5xx de la API vienen de la integración con Lambda" },
    { id: "dynamo-busy", label: "DynamoDB ocupado (92%) pero sin throttles" },
    { id: "old-deploy", label: "El último deploy de orders fue hace 3 días, solo config" },
  ],
  timeline: [
    { title: "Se disparó el schedule", detail: "nightly-export, primera ejecución" },
    { title: "El export se multiplica", detail: "report-export con 950 concurrentes" },
    { title: "Empiezan los throttles de orders-api", detail: "Throttles subiendo, errores planos" },
    { title: "Uso de lectura de DynamoDB en 92%", detail: "Sin solicitudes con throttling" },
    { title: "5xx de la API en 31%", detail: "Errores de integración" },
    { title: "El export sigue corriendo", detail: "Unos 15 minutos por ejecución" },
  ],
  rootCause: {
    title: "Concurrencia de Lambda agotada",
    hypothesis:
      "Un export nocturno nuevo lanza ~950 ejecuciones concurrentes de Lambda sin tope de concurrencia. La concurrencia de Lambda se comparte en toda la cuenta (límite 1,000), así que orders-api no consigue lugares de ejecución, sus invocaciones reciben throttling y API Gateway las devuelve como errores.",
    chain: [
      "Un schedule nuevo dispara report-export a las 02:00",
      "El export se multiplica a ~950 ejecuciones concurrentes",
      "El pool de concurrencia de la cuenta (1,000) casi se agota",
      "Las invocaciones de orders-api reciben throttling antes de correr",
      "API Gateway devuelve 5xx en ~31% de las solicitudes",
    ],
  },
  suspects: [
    { id: "a", label: "DynamoDB está haciendo throttling a la tabla de pedidos", detail: "El uso de lectura está en 92%", feedback: "Cero solicitudes con throttling y 7ms de latencia. La tabla está ocupada, no rechazando trabajo." },
    { id: "b", label: "El cambio de config de v3.8.1 rompió orders-api", detail: "Es el último cambio de la función", feedback: "Salió hace tres días y la tasa de error propia de la función está plana." },
    { id: "c", label: "El export está consumiendo la concurrencia de Lambda de la cuenta", detail: "Un batch y una API comparten un mismo pool", feedback: "950 de 1,000 lugares tomados por el export, y orders-api tiene throttling — no errores." },
    { id: "d", label: "Un pico de tráfico está sobrecargando API Gateway", detail: "La latencia saltó a 2.9s", feedback: "El tráfico está en su mínimo nocturno y el throttling del stage es cero." },
  ],
  question: "¿Qué harías?",
  options: [
    { id: "a", label: "Aumentar la capacidad de DynamoDB", detail: "Darle más throughput de lectura a la tabla", feedback: "La tabla no tiene throttles. Más capacidad no cambia nada para orders-api." },
    { id: "b", label: "Hacer rollback de orders-api a v3.8.0", detail: "Deshacer el último cambio", feedback: "El código ni siquiera está corriendo. Un rollback recibe throttling igual." },
    { id: "c", label: "Reservar concurrencia para orders-api y limitar el export", detail: "Garantizar lugares para la API; limitar el batch con concurrencia reservada", feedback: "orders-api siempre tiene sus lugares, y el batch no puede crecer más allá de su parte del pool." },
    { id: "d", label: "Aumentar el timeout de API Gateway", detail: "Darle más tiempo a la integración", feedback: "Las invocaciones con throttling se rechazan de inmediato. Esperar más no ayuda." },
  ],
  lesson:
    "La concurrencia de Lambda es un pool compartido por toda la cuenta. Dale concurrencia reservada a las funciones sensibles a la latencia y limita el fan-out de los batch, o un solo job puede tumbar la cuenta entera.",
  fallback: {
    whatsHappening:
      "Errores de checkout en 31% mientras el tráfico está en su mínimo del día, y no hubo deploys esta noche. Cuando baja la carga de usuarios pero suben los errores, busca otra cosa que compita por los mismos recursos.",
    nextStepByResource: {
      orders: "Abre la Lambda orders-api y compara sus errores con sus throttles.",
      batch: "Algo más corre de noche. Abre report-export y mira su concurrencia.",
      events: "Revisa el schedule de EventBridge — ¿cuándo se creó y cuándo corrió por primera vez?",
      api: "Abre API Gateway para ver dónde se originan los errores.",
      dynamo: "DynamoDB se ve ocupado. Ábrelo y revisa si de verdad está rechazando solicitudes.",
      deploy: "Abre el último deployment de orders-api y fíjate cuándo salió.",
    },
    whatChanged:
      "No hubo deploys esta noche — el último release de orders-api fue hace tres días. Pero algo nuevo corrió por primera vez a las 02:00. Revisa qué está programado.",
    metrics:
      "Un throttle de Lambda significa que la invocación se rechazó antes de que tu código corriera, porque no había un lugar de concurrencia disponible. La concurrencia la comparten todas las funciones de la cuenta, salvo que la reserves.",
    earlyRootCause:
      "Muy pronto para decirlo. Lo interesante es que la tasa de error de orders-api está plana mientras la API falla. Sigue mirando qué más está corriendo.",
    rootCause:
      "Tienes evidencia suficiente. Pregúntate por qué una función con errores planos seguiría fallando solicitudes, y qué más estaba ocupado en la cuenta a las 02:00. Elige la explicación que cubra todo.",
  },
  suggestedQuestions: [
    "¿Qué está pasando?",
    "¿Qué debería investigar ahora?",
    "¿Qué cambió recientemente?",
    "¿Qué es un throttle de Lambda?",
    "¿Cuál es la causa raíz probable?",
  ],
};
