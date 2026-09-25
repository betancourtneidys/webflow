import type { IncidentTranslation } from "./types";

export const secretRotationEs: IncidentTranslation = {
  title: "Pagos fallando en la mitad de la flota",
  short: "Credenciales viejas",
  pattern: "Rotación de secretos vs. credenciales cacheadas al arrancar",
  startedAgo: "hace 41 minutos",
  summary:
    "Alrededor de la mitad de los intentos de pago falla con \"base de datos no disponible\". La otra mitad pasa sin problemas, y no se desplegó nada esta noche.",
  headline: [{ label: "Pagos fallidos" }, { label: "Tareas sanas" }, { label: "CPU de RDS" }, { label: "Deploys esta noche" }],
  resources: [
    {
      id: "alb",
      metrics: [{ label: "HTTP 5xx" }, { label: "Targets sanos" }, { label: "Solicitudes / min" }, { label: "Latencia p50" }],
      observation:
        "Falla casi exactamente la mitad de las solicitudes — la misma proporción que los targets no sanos. El load balancer sigue repartiendo entre tareas que funcionan y tareas que no.",
    },
    {
      id: "secret",
      metrics: [
        { label: "Última rotación" },
        { label: "Frecuencia", value: "cada 30 días" },
        { label: "Estrategia", value: "usuario único" },
        { label: "Versiones" },
      ],
      details: { title: "Log de rotación" },
      observation:
        "La rotación programada corrió a las 03:00 y cambió la contraseña del usuario de la base en el lugar. Desde ese segundo, solo se acepta la contraseña nueva.",
    },
    {
      id: "kms",
      service: "Clave KMS",
      metrics: [
        { label: "Key policy", value: "cambió hace 3 días" },
        { label: "Errores de decrypt" },
        { label: "Solicitudes / hora" },
        { label: "Estado", value: "Habilitada" },
      ],
      details: { title: "Cambio en la key policy (hace 3 días)" },
      observation:
        "El cambio de policy agregó acceso de lectura para un rol de analytics hace tres días. Todas las llamadas de decrypt funcionan — las tareas pueden leer el secreto sin problema.",
    },
    {
      id: "ecs",
      service: "Servicio ECS",
      metrics: [
        { label: "Tareas en ejecución" },
        { label: "Health checks fallando" },
        { label: "Imagen", caption: "sin cambios desde el lunes" },
        { label: "Lectura del secreto", value: "al arrancar" },
      ],
      details: { title: "Tareas" },
      observation:
        "Misma imagen, misma configuración, y sin embargo tres tareas fallan y tres funcionan. Compara cuándo arrancó cada tarea con qué más pasó esta noche.",
    },
    {
      id: "rds",
      metrics: [{ label: "CPU" }, { label: "Conexiones" }, { label: "Fallas de auth / min" }, { label: "Mantenimiento", value: "pendiente (dom)" }],
      details: { title: "Log de PostgreSQL" },
      observation:
        "La base está sana y con mucho margen. Viene rechazando logins de payments_app desde IPs de tareas específicas desde las 03:00:05. El mantenimiento pendiente está programado para el domingo.",
    },
    {
      id: "scaling",
      service: "Política de Auto Scaling",
      metrics: [
        { label: "Última actividad", value: "+3 tareas a las 03:24" },
        { label: "Disparador" },
        { label: "Mín / máx" },
        { label: "Cooldown" },
      ],
      observation:
        "Autoscaling agregó tres tareas a las 03:24 porque las tareas que fallan reintentan agresivamente y subieron la CPU. Es una reacción al incidente, no su disparador.",
    },
  ],
  evidence: [
    { id: "secret-rotated", label: "Contraseña de la BD rotada en el lugar a las 03:00" },
    { id: "task-ages", label: "3 de 6 tareas fallan auth con la misma imagen" },
    { id: "rds-auth", label: "RDS rechaza los logins de payments_app desde las 03:00:05" },
    { id: "alb-half", label: "La mitad de los targets no está sana, 49% de errores" },
    { id: "scale-out", label: "Autoscaling agregó 3 tareas a las 03:24" },
    { id: "kms-policy", label: "La policy de KMS cambió hace 3 días, 0 errores de decrypt" },
  ],
  timeline: [
    { title: "Refresco nocturno de tareas", detail: "3 tareas arrancan y leen el secreto" },
    { title: "Comenzó la rotación", detail: "prod/payments/db" },
    { title: "Se actualizó la versión del secreto", detail: "La contraseña nueva es la vigente" },
    { title: "Empiezan las fallas de auth", detail: "payments_app rechazado" },
    { title: "3 de 6 targets no sanos", detail: "5xx en 49%" },
    { title: "Autoscaling +3 tareas", detail: "CPU por encima de 70%" },
    { title: "Tasa de error estable en ~49%", detail: "Sin recuperación" },
  ],
  rootCause: {
    title: "Credenciales viejas tras rotar el secreto",
    hypothesis:
      "Secrets Manager rotó la contraseña de la base a las 03:00 con la estrategia de usuario único. Las tareas que arrancaron antes cachearon la contraseña vieja al iniciar y nunca volvieron a leer el secreto, así que cada conexión que abren es rechazada. Las tareas lanzadas después de las 03:00 leyeron la contraseña nueva y funcionan — por eso falla exactamente la mitad más vieja de la flota.",
    chain: [
      "Las tareas leen el secreto de la BD una sola vez, a las 01:12",
      "La rotación cambia la contraseña en el lugar a las 03:00",
      "Las tareas viejas siguen usando la contraseña cacheada",
      "RDS rechaza sus logins; fallan los health checks",
      "Solo las tareas que arrancaron después de las 03:00 procesan pagos",
    ],
  },
  suspects: [
    { id: "a", label: "El cambio en la policy de KMS impide descifrar el secreto", detail: "La key policy se editó hace poco", feedback: "Cero errores de decrypt, y las tareas sanas leen exactamente el mismo secreto." },
    { id: "b", label: "La base de datos está sobrecargada", detail: "Falla la mitad de las conexiones", feedback: "CPU 22% y 140 de 500 conexiones. Está rechazando una contraseña, no carga." },
    { id: "c", label: "Las tareas que arrancaron antes de las 03:00 siguen usando la contraseña vieja", detail: "El secreto solo se lee al arrancar", feedback: "Las tareas que fallan son anteriores a la rotación; las sanas arrancaron después." },
    { id: "d", label: "Autoscaling lanzó tareas rotas", detail: "Se agregaron tres tareas a las 03:24", feedback: "Al revés: las tareas agregadas a las 03:24 son las sanas." },
  ],
  question: "¿Qué harías?",
  options: [
    { id: "a", label: "Revertir la key policy de KMS", detail: "Deshacer el cambio de hace tres días", feedback: "El decrypt funciona. Las tareas pueden leer el secreto — simplemente nunca lo vuelven a leer." },
    { id: "b", label: "Desactivar la rotación automática", detail: "Evitar que las rotaciones rompan el servicio", feedback: "Quita un control de seguridad, y las tres tareas viejas siguen rotas de todas formas." },
    {
      id: "c",
      label: "Reemplazar las tareas viejas y refrescar el secreto ante errores de auth",
      detail: "Forzar un nuevo deployment ya; volver a leer el secreto cuando falle el login (o usar la rotación de usuarios alternados)",
      feedback: "Las tareas viejas toman la contraseña vigente, y las próximas rotaciones dejan de ser incidentes.",
    },
    { id: "d", label: "Aumentar max_connections de RDS", detail: "Permitir más sesiones concurrentes", feedback: "La base tiene 360 conexiones libres. Está rechazando credenciales, no capacidad." },
  ],
  lesson:
    "La rotación solo funciona si los clientes vuelven a leer las credenciales. Refresca los secretos ante fallas de autenticación o con un temporizador, o usa la estrategia de usuarios alternados para que la contraseña anterior siga siendo válida hasta que todos se muevan.",
  fallback: {
    whatsHappening:
      "Alrededor de la mitad de los pagos falla mientras la base, el tráfico y el código se ven sin cambios. Cuando falla exactamente la mitad de una flota con la misma imagen y configuración, busca qué diferencia a las tareas que fallan de las que no.",
    nextStepByResource: {
      ecs: "Abre payments-svc y mira las tareas una por una.",
      secret: "Algo corrió a las 03:00. Abre el secreto de la base en Secrets Manager.",
      rds: "Abre payments-db y lee su log, no solo su CPU.",
      alb: "Abre el load balancer y compara la tasa de error con la cantidad de targets sanos.",
      scaling: "Revisa la política de autoscaling — ¿qué hizo esta noche y qué tareas creó?",
      kms: "La key policy de KMS cambió hace poco. Ábrela y revisa si están fallando los decrypt.",
    },
    whatChanged:
      "No hubo deploys esta noche. Pero sí pasaron dos cosas: un job programado corrió a las 03:00 y autoscaling agregó tareas a las 03:24. También quedó registrado un cambio de policy de KMS de hace tres días. Ponlos en orden frente a la hora de arranque de las tareas.",
    metrics:
      "La rotación de Secrets Manager crea una credencial nueva y la cambia en la base. Con la estrategia de usuario único, la contraseña vieja deja de funcionar de inmediato, así que cualquier cliente que la haya cacheado tiene que volver a leer el secreto.",
    earlyRootCause:
      "Todavía no puedo señalar una causa. El patrón más fuerte es la división: algunas tareas fallan y otras no. Averigua qué las hace distintas.",
    rootCause:
      "Tienes evidencia suficiente. Compara cuándo arrancó cada tarea con cuándo cambió el secreto, y recuerda que las tareas sanas leen el mismo secreto con la misma clave KMS. Elige la explicación que encaje con las dos mitades de la flota.",
  },
  suggestedQuestions: [
    "¿Qué está pasando?",
    "¿Qué debería investigar ahora?",
    "¿Qué cambió recientemente?",
    "¿Qué hace la rotación de secretos?",
    "¿Cuál es la causa raíz probable?",
  ],
};
