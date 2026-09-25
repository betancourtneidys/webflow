import type { IncidentTranslation } from "./types";

export const dbExhaustionEs: IncidentTranslation = {
  title: "API de producción degradada",
  short: "Agotamiento de la base de datos",
  pattern: "Agotamiento del pool de conexiones tras un deploy",
  startedAgo: "hace 8 minutos",
  summary: "Las solicitudes de checkout son lentas y fallan. Los clientes reportan timeouts al confirmar el pago.",
  headline: [{ label: "Latencia de la API" }, { label: "Tasa de error" }, { label: "Conexiones RDS" }, { label: "Backlog de SQS" }],
  resources: [
    {
      id: "alb",
      metrics: [{ label: "Latencia p99" }, { label: "HTTP 5xx" }, { label: "Solicitudes / min" }, { label: "Targets sanos" }],
      observation:
        "El tráfico está estable, así que no es un pico de carga. El ALB está sano, pero sus targets responden lento y con 5xx: el problema está detrás del load balancer.",
    },
    {
      id: "lambda",
      service: "Función Lambda",
      metrics: [{ label: "Invocaciones" }, { label: "Errores" }, { label: "Duración p95" }, { label: "Concurrencia", caption: "910 / 1,000 reservadas" }],
      details: { title: "Logs recientes" },
      observation:
        "La tasa de error saltó justo después del último deploy. Varios errores dicen 'too many connections': la función está esperando a la base de datos, no fallando por su propia lógica.",
    },
    {
      id: "rds",
      metrics: [{ label: "Conexiones" }, { label: "CPU" }, { label: "Latencia de lectura" }, { label: "Latencia de escritura" }],
      observation:
        "Las conexiones a la base de datos se acercan al límite configurado. La CPU está alta pero no saturada: la base está desbordada por cantidad de conexiones, no por volumen de consultas.",
    },
    {
      id: "sqs",
      service: "Cola SQS",
      metrics: [{ label: "Mensajes visibles" }, { label: "Mensaje más antiguo" }, { label: "Consumidores", value: "sanos" }, { label: "DLQ" }],
      observation:
        "El backlog crece porque los eventos de pago se publican recién después de una escritura exitosa en la base. Es un síntoma aguas abajo: la cola y sus consumidores están sanos.",
    },
    {
      id: "deploy",
      metrics: [{ label: "Desplegado" }, { label: "Autor" }, { label: "Archivos cambiados" }, { label: "Rollback", value: "disponible" }],
      observation:
        "Este cambio movió el pool de conexiones dentro del handler y subió su tamaño de 2 a 10. Cada invocación ahora abre su propio pool en vez de reutilizar uno.",
    },
  ],
  evidence: [
    { id: "lambda-errors", label: "Los errores de Lambda subieron a 38% tras el deploy" },
    { id: "rds-connections", label: "Conexiones RDS en 487 / 500" },
    { id: "deploy-change", label: "El deploy movió el pool de BD al handler" },
    { id: "alb-latency", label: "Latencia del ALB de 4.8s con tráfico estable" },
    { id: "sqs-backlog", label: "El backlog de SQS es un síntoma aguas abajo" },
  ],
  timeline: [
    { title: "Comenzó el deploy", detail: "payments-api v2.14.0 vía GitHub Actions" },
    { title: "Lambda actualizada", detail: "Nueva versión activa en el alias prod" },
    { title: "Subió la tasa de error", detail: "Errores de Lambda 0.3% → 13%" },
    { title: "Subieron las conexiones RDS", detail: "140 → 450 en 17 segundos" },
    { title: "Crece el backlog de la cola", detail: "Suben los mensajes visibles en payment-events" },
    { title: "Subió la latencia de la API", detail: "p99 del ALB por encima del SLO de 2s" },
  ],
  rootCause: {
    title: "Agotamiento de conexiones a la base de datos",
    hypothesis:
      "El último deploy de Lambda crea un pool de conexiones nuevo en cada invocación. Con ~900 ejecuciones concurrentes reteniendo conexiones, RDS llega a max_connections y las nuevas solicitudes esperan hasta hacer timeout.",
    chain: [
      "v2.14.0 movió createPool() dentro del handler",
      "Cada Lambda concurrente abre su propio pool",
      "RDS llega a 487 / 500 conexiones",
      "Las consultas esperan una conexión libre y hacen timeout",
      "La API devuelve 5xx y la latencia sube a 4.8s",
    ],
  },
  question: "¿Qué harías?",
  options: [
    { id: "a", label: "Aumentar el timeout de Lambda", detail: "Darle más tiempo a cada invocación", feedback: "Timeouts más largos mantienen las conexiones abiertas aún más tiempo y empeoran el agotamiento." },
    { id: "b", label: "Aumentar el tamaño de la instancia RDS", detail: "Escalar para subir max_connections", feedback: "Te da unos minutos, pero las conexiones siguen creciendo con la concurrencia. La fuga está en el código." },
    { id: "c", label: "Corregir el manejo de conexiones a la base", detail: "Reutilizar un pool a nivel de módulo (o usar RDS Proxy) y hacer rollback de v2.14.0", feedback: "Las conexiones se reutilizan entre invocaciones y dejan de crecer con la concurrencia." },
    { id: "d", label: "Aumentar el visibility timeout de SQS", detail: "Darles más tiempo a los consumidores por mensaje", feedback: "La cola es un síntoma. Sus consumidores están sanos." },
  ],
  lesson:
    "En serverless, las conexiones escalan con la concurrencia. Crea los clientes fuera del handler y pon un pooler como RDS Proxy delante de las bases relacionales.",
  fallback: {
    whatsHappening:
      "La API tiene errores y latencia elevados mientras el tráfico está estable. Dos señales se destacan: los errores de Lambda subieron justo después del último deploy, y las conexiones a RDS se acercan a su límite configurado. Investigar el patrón de conexiones a la base puede ayudar a acotar la causa.",
    nextStepByResource: {
      alb: "Empieza por el borde: abre el ALB para confirmar si es un pico de tráfico o algo detrás del load balancer.",
      lambda: "Abre la Lambda payments-api. Compara su tasa de error y sus logs con la hora del deploy.",
      rds: "Revisa payments-db. Mira las conexiones frente a max_connections, no solo la CPU.",
      deploy: "Algo cambió a las 08:42. Abre el deploy y lee el diff.",
      sqs: "El backlog de SQS está creciendo. Revisa si la cola es causa o síntoma.",
    },
    whatChanged:
      "payments-api v2.14.0 se desplegó a las 08:42:34, unos 30 segundos antes de que empezaran los errores. Ese timing es una señal fuerte — abre el nodo del deploy para ver qué tocó el diff.",
    metrics:
      "Las conexiones indican cuántos clientes tienen una sesión abierta con la base. Cuando se acercan a max_connections, las consultas nuevas esperan un lugar libre. Esa espera aparece aguas arriba como duración de Lambda, timeouts y latencia de la API.",
    earlyRootCause:
      "Todavía no quiero sacar conclusiones. Los errores se correlacionan con el deploy y con el aumento de conexiones a la base, pero necesitamos más evidencia para conectarlos. Sigue inspeccionando los recursos del diagrama.",
    rootCause:
      "La evidencia encaja: v2.14.0 crea un pool de conexiones por invocación, la concurrencia está al 91% y RDS tiene 487 de 500 conexiones. Lambda está agotando las conexiones de la base. Tienes lo suficiente para armar la hipótesis.",
  },
  suggestedQuestions: [
    "¿Qué está pasando?",
    "¿Qué debería investigar ahora?",
    "¿Qué cambió recientemente?",
    "¿Por qué importa RDS?",
    "¿Cuál es la causa raíz probable?",
  ],
};
