import type { IncidentTranslation } from "./types";

export const dnsWeightedLegacyEs: IncidentTranslation = {
  title: "Errores intermitentes en el checkout",
  short: "DNS partido en dos",
  pattern: "Un registro ponderado olvidado tras una migración de región",
  startedAgo: "hace 17 minutos",
  summary:
    "Alrededor de una de cada cinco solicitudes de checkout falla con 502. Reintentar suele funcionar, así que soporte no logra reproducirlo a pedido.",
  headline: [{ label: "Tasa de error" }, { label: "Reintentos exitosos" }, { label: "Latencia p50" }, { label: "Tráfico" }],
  resources: [
    {
      id: "cdn",
      service: "Distribución de CloudFront",
      metrics: [{ label: "5xx" }, { label: "Cache hit ratio" }, { label: "Latencia del origen" }, { label: "Solicitudes / min" }],
      observation:
        "Los 502 vienen del origen, no del borde: CloudFront los deja pasar. El cache hit ratio bajó porque las respuestas de error no se cachean — un efecto secundario, no una causa. Fíjate qué estable es la tasa de error.",
    },
    {
      id: "deploy",
      metrics: [{ label: "Desplegado" }, { label: "Cambio", value: "CSS + imágenes" }, { label: "Archivos cambiados" }, { label: "Rollback", value: "disponible" }],
      details: { title: "Resumen del release" },
      observation:
        "Un release del storefront salió dos minutos antes de los errores. Solo tocó assets estáticos servidos desde S3 — no puede hacer que un load balancer responda 502.",
    },
    {
      id: "dns",
      service: "Route 53 · ponderado",
      metrics: [{ label: "Registros", value: "2 ponderados" }, { label: "Pesos" }, { label: "Evaluar salud del target", value: "no" }, { label: "TTL" }],
      details: { title: "Record sets" },
      observation:
        "CloudFront resuelve su origen a través de dos registros ponderados. El 20% de las consultas recibe el load balancer legacy y, como no se evalúa la salud del target, Route 53 lo sigue entregando esté como esté.",
    },
    {
      id: "alb-new",
      metrics: [{ label: "HTTP 5xx" }, { label: "Targets sanos" }, { label: "Solicitudes / min" }, { label: "p99" }],
      observation: "El load balancer nuevo está bien: todos los targets sanos y casi sin errores. Lleva cerca del 80% del tráfico.",
    },
    {
      id: "alb-legacy",
      metrics: [{ label: "HTTP 502" }, { label: "Targets sanos" }, { label: "Solicitudes / min" }, { label: "Creado", value: "hace 2 años" }],
      details: { title: "Access logs" },
      observation:
        "Aquí falla cada solicitud: el target group está vacío. Aun así recibe ~840 solicitudes por minuto — más o menos una quinta parte del tráfico total.",
    },
    {
      id: "ecs-new",
      service: "Servicio ECS · us-east-1",
      metrics: [{ label: "Tareas" }, { label: "CPU" }, { label: "Memoria" }, { label: "Throttling" }],
      observation:
        "La CPU subió porque esta región ahora atiende la mayor parte del tráfico, pero las tareas están sanas y nada tiene throttling. Ocupado no es roto.",
    },
    {
      id: "ecs-legacy",
      service: "Servicio ECS · us-west-2",
      metrics: [{ label: "Tareas deseadas" }, { label: "En ejecución" }, { label: "Último cambio", value: "hoy 09:02" }, { label: "Cambiado por" }],
      details: { title: "Evento de CloudTrail" },
      observation:
        "El runbook de migración escaló el servicio legacy a cero a las 09:02 — el paso 7 del cutover. El paso 8 era eliminar el registro DNS legacy.",
    },
  ],
  evidence: [
    { id: "dns-weighted", label: "El DNS del origen reparte 80 / 20, salud del target apagada" },
    { id: "alb-legacy-empty", label: "El ALB legacy no tiene targets, 100% 502" },
    { id: "legacy-scaled-down", label: "El runbook escaló la región legacy a 0 a las 09:02" },
    { id: "cdn-5xx", label: "5xx en el borde estable en ~19%" },
    { id: "alb-new-healthy", label: "El ALB de us-east-1 está sano, ~80% del tráfico" },
    { id: "ecs-busy", label: "La región nueva está ocupada (CPU 78%) pero sana" },
    { id: "frontend-deploy", label: "El release del frontend solo cambió assets estáticos" },
  ],
  timeline: [
    { title: "Comenzó el cutover de la migración", detail: "Runbook: mover checkout a us-east-1" },
    { title: "Pesos DNS en 80 / 20", detail: "Paso canary en origin.acme.io" },
    { title: "Se desplegó storefront v4.2.0", detail: "Cambios de CSS e imágenes" },
    { title: "Servicio legacy escalado a 0", detail: "checkout-usw2 desiredCount 0" },
    { title: "Targets legacy drenados", detail: "El target group quedó vacío" },
    { title: "5xx en el borde sube a 19%", detail: "Estable desde entonces" },
    { title: "Paso 8 del runbook pendiente", detail: "Eliminar el registro DNS legacy" },
  ],
  rootCause: {
    title: "DNS ponderado que sigue enviando a una región drenada",
    hypothesis:
      "El runbook de migración escaló la región legacy a cero pero nunca eliminó su registro ponderado de Route 53. Sin evaluar la salud del target, el 20% de las consultas del origen sigue resolviendo a un load balancer vacío que responde 502 — por eso falla más o menos una de cada cinco solicitudes, y un reintento suele caer en la región sana.",
    chain: [
      "El runbook pasa los pesos del origen a 80 / 20",
      "El servicio ECS legacy se escala a 0 a las 09:02",
      "El ALB legacy no tiene targets y devuelve 502",
      "Route 53 ignora la salud del target y sigue respondiendo con él",
      "~20% de las solicitudes falla; los reintentos casi siempre funcionan",
    ],
  },
  suspects: [
    { id: "a", label: "El release del storefront rompió el checkout", detail: "v4.2.0 salió dos minutos antes de los errores", feedback: "Solo cambió assets estáticos, y los 502 vienen de un load balancer." },
    { id: "b", label: "us-east-1 no da abasto con el tráfico migrado", detail: "La CPU está en 78% tras el cutover", feedback: "12/12 targets sanos y 0.2% de errores. Esa región está ocupada, no fallando." },
    { id: "c", label: "El DNS sigue enviando una quinta parte del tráfico a una región vacía", detail: "El registro legacy sobrevivió al servicio que tenía detrás", feedback: "El peso de 20%, el target group legacy vacío y la tasa de error de ~19% encajan entre sí." },
    { id: "d", label: "CloudFront está sirviendo errores cacheados", detail: "El cache hit ratio se desplomó al mismo tiempo", feedback: "Los errores no se están cacheando — justamente por eso bajó el hit ratio." },
  ],
  question: "¿Qué harías?",
  options: [
    { id: "a", label: "Hacer rollback de storefront v4.2.0", detail: "Deshacer el release más reciente", feedback: "Los assets estáticos no pueden hacer que un load balancer devuelva 502. Los errores seguirían." },
    { id: "b", label: "Escalar checkout-use1", detail: "Agregar tareas en la región nueva", feedback: "La región nueva no está fallando. El camino roto es al que todavía apunta el DNS." },
    { id: "c", label: "Invalidar la caché de CloudFront", detail: "Vaciar lo que tenga guardado el borde", feedback: "Las respuestas de error no se cachean, así que no hay nada que vaciar." },
    { id: "d", label: "Eliminar el registro ponderado legacy", detail: "Y activar Evaluate Target Health en el que queda", feedback: "Todas las consultas resuelven a la región sana, y un target vacío no se puede volver a entregar." },
  ],
  lesson:
    "Los registros ponderados y de failover solo te protegen si evalúan la salud del target. En una migración, haz que \"eliminar el registro viejo\" sea parte del mismo cambio que drena la región vieja.",
  fallback: {
    whatsHappening:
      "Alrededor del 19% de las solicitudes de checkout falla con 502 mientras la latencia y el tráfico se ven normales. Una tasa de error parcial y estable que desaparece al reintentar suele significar que algunas solicitudes toman un camino distinto al de otras. Busca dónde se divide el tráfico.",
    nextStepByResource: {
      cdn: "Empieza por el borde: abre la distribución de CloudFront y mira cómo se comporta la tasa de error en el tiempo.",
      dns: "CloudFront llega a su origen a través del DNS. Abre origin.acme.io y revisa cómo responde.",
      "alb-legacy": "Hay dos load balancers. Abre el legacy y compáralo con el nuevo.",
      "ecs-legacy": "Revisa el servicio ECS legacy — ¿qué le pasó durante la migración?",
      "alb-new": "Abre el load balancer de us-east-1 para ver si la región nueva está sana.",
      "ecs-new": "Abre checkout-use1 y decide si su CPU es causa o consecuencia.",
      deploy: "Salió un release a las 09:01. Ábrelo y revisa qué tocó.",
    },
    whatChanged:
      "Cambiaron tres cosas en veinte minutos: los pesos DNS a las 08:52, un release del storefront a las 09:01 y el escalado a cero del servicio legacy a las 09:02. Solo algunas pueden hacer que un load balancer devuelva 502 — revisa cada una.",
    metrics:
      "El enrutamiento ponderado reparte las respuestas DNS por porcentaje. Si Evaluate Target Health está apagado, Route 53 sigue devolviendo un registro aunque no haya nada sano detrás — así que una parte fija de los clientes sigue fallando.",
    earlyRootCause:
      "Todavía no alcanza para decirlo. Pero una tasa de falla estable de ~19% es un patrón fuerte. Averigua qué parte del sistema maneja más o menos una quinta parte del tráfico.",
    rootCause:
      "Tienes lo que necesitas. Compara la tasa de error con los pesos del DNS, y revisa qué quedó detrás del load balancer que recibe la parte más chica. Después elige la explicación que encaja con todas las señales, no solo con una.",
  },
  suggestedQuestions: [
    "¿Qué está pasando?",
    "¿Qué debería investigar ahora?",
    "¿Qué cambió recientemente?",
    "¿Por qué funcionaría un reintento?",
    "¿Cuál es la causa raíz probable?",
  ],
};
