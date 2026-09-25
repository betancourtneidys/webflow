import type { IncidentTranslation } from "./types";

export const oidcTrustEs: IncidentTranslation = {
  title: "Falla de deployment",
  short: "Falla de deploy por IAM",
  pattern: "Subject de OIDC que no coincide con la trust policy de IAM",
  startedAgo: "hace 31 minutos",
  summary: "Un hotfix de seguridad no puede llegar a producción. Cada deploy desde esta mañana aborta antes de tocar AWS.",
  headline: [{ label: "Deploys fallidos" }, { label: "AssumeRole denegados" }, { label: "Versión en prod" }, { label: "Hotfix bloqueado" }],
  resources: [
    {
      id: "github",
      metrics: [{ label: "Últimas 4 ejecuciones", value: "fallaron" }, { label: "Paso que falla" }, { label: "Duración" }, { label: "Workflow modificado" }],
      details: { title: "Log del job" },
      observation:
        "El job nunca llega a AWS: falla al intercambiar el token de GitHub por credenciales de AWS. El workflow se editó minutos antes de la primera falla — el PR #412 agregó un environment de deployment.",
    },
    {
      id: "oidc",
      service: "Token de identidad de GitHub",
      metrics: [{ label: "Token emitido", value: "sí" }, { label: "aud" }, { label: "Thumbprint del proveedor", value: "válido" }, { label: "Formato del sub" }],
      details: { title: "Claims del token" },
      observation:
        "GitHub emite un token válido. Cuando un job usa un environment, el claim sub pasa a ser repo:…:environment:production en lugar de repo:…:ref:refs/heads/main.",
    },
    {
      id: "sts",
      metrics: [{ label: "Llamadas" }, { label: "errorCode" }, { label: "Exitosas" }, { label: "Origen" }],
      details: { title: "Evento de CloudTrail" },
      observation:
        "STS recibió el token y lo rechazó. AccessDenied aquí significa que la trust policy del rol no coincidió con el token — la policy de permisos ni siquiera se evalúa.",
    },
    {
      id: "iam",
      service: "Rol IAM",
      metrics: [
        { label: "Trust policy", value: "OIDC federado" },
        { label: "Última modificación", value: "hace 3 meses" },
        { label: "Condición" },
        { label: "Último uso", value: "ayer" },
      ],
      details: { title: "Trust policy — Condition" },
      observation:
        "La trust policy solo acepta el subject ref:refs/heads/main. El token ahora trae environment:production, así que la condición StringEquals falla.",
    },
    {
      id: "ecs",
      service: "Servicio ECS",
      metrics: [{ label: "Versión en ejecución" }, { label: "Tareas" }, { label: "CPU" }, { label: "Último deploy", value: "ayer" }],
      observation:
        "Producción está sana pero congelada en la versión de ayer. Nada está roto en runtime — el pipeline no puede obtener credenciales para enviar el hotfix.",
    },
  ],
  evidence: [
    { id: "workflow-failed", label: "El deploy falla en configure-aws-credentials" },
    { id: "token-claims", label: "El sub del token es environment:production" },
    { id: "cloudtrail-denied", label: "CloudTrail: AccessDenied en AssumeRoleWithWebIdentity" },
    { id: "trust-policy", label: "La trust policy solo permite ref:refs/heads/main" },
    { id: "prod-unchanged", label: "Prod sana pero atascada en v1.8.2" },
  ],
  timeline: [
    { title: "Se mergeó el PR #412", detail: "Agrega environment: production al job de deploy" },
    { title: "Comenzó el deploy", detail: "deploy-prod.yml en main" },
    { title: "Se emitió el token OIDC", detail: "El claim sub ahora usa el environment" },
    { title: "AssumeRole denegado", detail: "CloudTrail: AccessDenied" },
    { title: "Se evaluó la trust policy", detail: "La condición sub no coincidió" },
    { title: "Deploy abortado", detail: "Producción sigue en v1.8.2" },
  ],
  rootCause: {
    title: "La trust policy de IAM rechaza el subject de OIDC",
    hypothesis:
      "El PR #412 agregó un environment de GitHub al job de deploy, lo que cambia el claim sub del token a repo:acme/payments-api:environment:production. La trust policy del rol todavía exige ref:refs/heads/main, así que STS deniega AssumeRoleWithWebIdentity.",
    chain: [
      "El PR #412 agrega environment: production",
      "GitHub emite sub = …:environment:production",
      "La trust policy espera …:ref:refs/heads/main",
      "STS devuelve AccessDenied",
      "El deploy aborta antes de llegar a AWS",
    ],
  },
  question: "¿Qué harías?",
  options: [
    { id: "a", label: "Adjuntar AdministratorAccess al rol", detail: "Asegurar que el rol pueda hacer todo", feedback: "Las policies de permisos ni se evalúan — el rol ni siquiera se puede asumir. Y el radio de impacto es enorme." },
    { id: "b", label: "Usar access keys de larga duración", detail: "Guardar una key de usuario IAM en los secrets de GitHub", feedback: "Destraba el deploy tirando OIDC a la basura. Las keys estáticas se filtran y nunca expiran." },
    { id: "c", label: "Actualizar el subject de la trust policy", detail: "Permitir repo:acme/payments-api:environment:production en la condición sub", feedback: "El rol confía exactamente en el subject que ahora presenta el workflow — sigue acotado a un repo y un environment." },
    { id: "d", label: "Aumentar la duración máxima de sesión del rol", detail: "Puede que las sesiones expiren muy rápido", feedback: "Nunca se crea una sesión. La duración es irrelevante si falla la verificación de confianza." },
  ],
  lesson:
    "El claim sub de OIDC depende de cómo corre el job: rama, tag, pull request o environment. Cualquier cambio en el workflow puede cambiarlo — mira el userName en CloudTrail para ver el subject exacto que recibió AWS.",
  fallback: {
    whatsHappening:
      "Producción funciona bien, pero cada deploy desde las 10:14 falla antes de llegar a AWS. El pipeline no puede obtener credenciales, así que el problema está en la cadena de identidad entre GitHub y el rol IAM.",
    nextStepByResource: {
      github: "Abre el workflow de GitHub Actions y lee el paso que falla.",
      oidc: "Inspecciona el token OIDC. ¿Qué claims está enviando GitHub?",
      sts: "Mira el evento de CloudTrail de AssumeRoleWithWebIdentity.",
      iam: "Abre el rol IAM y lee las condiciones de la trust policy.",
      ecs: "Revisa el servicio de producción para entender el impacto en clientes.",
    },
    whatChanged:
      "El PR #412 se mergeó a las 10:12, dos minutos antes de la primera falla. Cambió el propio workflow de deploy — vale la pena revisar qué le hace eso al token que emite GitHub.",
    metrics:
      "AssumeRoleWithWebIdentity intercambia un token OIDC de GitHub por credenciales temporales de AWS. AWS primero compara la trust policy del rol con los claims del token (iss, aud, sub). Si eso falla, obtienes AccessDenied, sin importar qué permisos tenga el rol.",
    earlyRootCause:
      "Es muy pronto para señalar una única causa. Sabemos que AWS deniega el intercambio de credenciales, pero no por qué. Compara lo que dice el token con lo que espera el rol.",
    rootCause:
      "El sub del token es repo:acme/payments-api:environment:production, pero la trust policy solo permite ref:refs/heads/main. Esa diferencia es la razón por la que STS deniega el rol. Tienes lo suficiente para armar la hipótesis.",
  },
  suggestedQuestions: [
    "¿Qué está pasando?",
    "¿Qué debería investigar ahora?",
    "¿Qué cambió recientemente?",
    "¿Qué es el claim sub?",
    "¿Cuál es la causa raíz probable?",
  ],
};
