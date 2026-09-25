import type { IncidentTranslation } from "./types";

export const queueBacklogEs: IncidentTranslation = {
  title: "Demora en el procesamiento de SQS",
  short: "Backlog en la cola",
  pattern: "Mensajes envenenados reintentados sin fin",
  startedAgo: "hace 23 minutos",
  summary: "Los pedidos se aceptan pero nunca se confirman. Los clientes reciben emails de 'procesando' sin novedades.",
  headline: [{ label: "Profundidad de la cola" }, { label: "Mensaje más antiguo" }, { label: "Errores de workers" }, { label: "Pedidos confirmados" }],
  resources: [
    {
      id: "api",
      metrics: [{ label: "Solicitudes / min" }, { label: "5xx" }, { label: "Latencia p95" }, { label: "Mensajes publicados" }],
      observation:
        "La entrada se ve normal: solicitudes y tasa de publicación estables. El backlog no se debe a un pico de tráfico — los mensajes entran al ritmo habitual pero no salen.",
    },
    {
      id: "sqs",
      service: "Cola SQS",
      metrics: [
        { label: "Mensajes visibles" },
        { label: "Antigüedad del más viejo" },
        { label: "Recepciones / msg", caption: "ApproximateReceiveCount promedio" },
        { label: "Redrive a la DLQ tras", value: "50 intentos" },
      ],
      observation:
        "Los mensajes se reciben muchas veces cada uno. Se toman, fallan, vuelven a ser visibles y regresan a la cola — los mismos mensajes se reintentan una y otra vez.",
    },
    {
      id: "workers",
      metrics: [{ label: "Errores" }, { label: "Exitosas" }, { label: "Duración p95" }, { label: "Concurrencia", caption: "sin throttling" }],
      details: { title: "Logs recientes" },
      observation:
        "Los workers no son lentos ni tienen throttling — fallan rápido. El error es un TypeError sobre order.amount, lo que apunta a un cambio en el payload del mensaje.",
    },
    {
      id: "dlq",
      metrics: [{ label: "Mensajes" }, { label: "maxReceiveCount" }, { label: "Alarma", value: "ninguna" }, { label: "Retención", value: "14 días" }],
      observation:
        "La DLQ está vacía aunque los workers fallan el 62% de las veces. Con maxReceiveCount en 50, los mensajes rotos siguen circulando en la cola principal en lugar de aislarse.",
    },
    {
      id: "deploy",
      metrics: [{ label: "Desplegado" }, { label: "Servicio" }, { label: "Cambio" }, { label: "Consumidores actualizados" }],
      details: { title: "Payload del mensaje — antes / después" },
      observation: "El productor empezó a publicar el schema v2, donde amount es un objeto. El worker todavía espera un número.",
    },
    {
      id: "table",
      service: "Tabla DynamoDB",
      metrics: [{ label: "Capacidad de escritura" }, { label: "Throttles" }, { label: "Latencia" }, { label: "Escrituras / min" }],
      observation: "La tabla está sana y lejos de sus límites. Las escrituras bajaron solo porque llegan menos pedidos a este paso.",
    },
  ],
  evidence: [
    { id: "worker-errors", label: "Los workers fallan con TypeError en order.amount" },
    { id: "sqs-depth", label: "Profundidad 48k, mensajes recibidos ~15 veces" },
    { id: "deploy-schema", label: "El productor pasó al payload v2" },
    { id: "dlq-empty", label: "DLQ vacía — las fallas se repiten sin fin" },
    { id: "api-normal", label: "La entrada es estable — no es un pico de tráfico" },
  ],
  timeline: [
    { title: "Comenzó el deploy", detail: "orders-api v5.3.0" },
    { title: "El productor publica v2", detail: "amount ahora es un objeto" },
    { title: "Subieron los errores de workers", detail: "TypeError en order.amount" },
    { title: "Crece la profundidad de la cola", detail: "Mensajes visibles 40 → 2,600" },
    { title: "La DLQ sigue vacía", detail: "No se disparó ninguna alarma" },
    { title: "Mensaje más antiguo > 15m", detail: "Se incumplió el SLO de confirmación" },
  ],
  rootCause: {
    title: "Mensajes envenenados bloqueando la cola",
    hypothesis:
      "orders-api v5.3.0 empezó a publicar un nuevo formato de payload. El worker falla con él, los mensajes vuelven a la cola y se reintentan hasta 50 veces, así que las fallas se acumulan y desplazan a los mensajes sanos.",
    chain: [
      "El productor despliega el payload v2",
      "El worker lanza un TypeError en order.amount",
      "Los lotes fallidos vuelven a la cola",
      "maxReceiveCount 50 los mantiene circulando",
      "Crecen la profundidad de la cola y la antigüedad de los mensajes",
    ],
  },
  question: "¿Qué harías?",
  options: [
    { id: "a", label: "Escalar la concurrencia de los workers", detail: "Más workers para vaciar la cola", feedback: "Los workers no tienen throttling. Más workers solo fallan los mismos mensajes más rápido." },
    { id: "b", label: "Aumentar la retención de mensajes", detail: "Guardar los mensajes más tiempo para no perder ninguno", feedback: "Eso esconde el problema. Los mensajes siguen sin poder procesarse." },
    { id: "c", label: "Corregir el worker para el payload v2", detail: "Soportar ambos schemas, bajar maxReceiveCount y hacer redrive desde la DLQ", feedback: "El worker procesa ambos formatos y los mensajes malos se aíslan en lugar de reintentarse sin fin." },
    { id: "d", label: "Aumentar el visibility timeout", detail: "Dar más tiempo de procesamiento por mensaje", feedback: "Los workers fallan en ~300ms. El timeout no es la restricción." },
  ],
  lesson:
    "Las colas esconden las fallas. Versiona tus contratos de mensajes, mantén bajo el maxReceiveCount y pon alarmas sobre la profundidad de la DLQ y la antigüedad de los mensajes — no solo sobre el tamaño de la cola.",
  fallback: {
    whatsHappening:
      "Los pedidos se aceptan, pero la cola no para de crecer y el mensaje más antiguo tiene 23 minutos. Los mensajes entran al ritmo normal y no salen. Los workers son el primer lugar donde mirar.",
    nextStepByResource: {
      api: "Revisa primero orders-api para descartar un pico de tráfico.",
      sqs: "Abre orders-queue y mira cuántas veces se recibe cada mensaje.",
      workers: "Abre la Lambda order-worker y lee los logs de error.",
      dlq: "Revisa la dead-letter queue. Si los workers fallan, ¿adónde van los mensajes fallidos?",
      deploy: "Algo se desplegó a las 14:04. Ábrelo y compara el payload.",
    },
    whatChanged:
      "orders-api v5.3.0 se desplegó a las 14:04:51, veinte segundos antes de que empezaran los errores de los workers. Es el productor, no el worker — revisa qué publica.",
    metrics:
      "La profundidad de la cola es cuántos mensajes esperan ser procesados. La antigüedad del más viejo te dice cuánto vas atrasado. Un receive count alto significa que los mismos mensajes se reintentan en lugar de completarse.",
    earlyRootCause:
      "El backlog está claramente ligado a las fallas de los workers, pero todavía no puedo decir por qué fallan. Sigue reuniendo evidencia — los logs y los cambios recientes deberían decírnoslo.",
    rootCause:
      "El productor cambió el formato del payload, los workers fallan con él y el maxReceiveCount alto mantiene los mensajes fallidos circulando. Tienes lo suficiente para armar la hipótesis.",
  },
  suggestedQuestions: [
    "¿Qué está pasando?",
    "¿Qué debería investigar ahora?",
    "¿Qué cambió recientemente?",
    "¿Qué significa receive count?",
    "¿Cuál es la causa raíz probable?",
  ],
};
