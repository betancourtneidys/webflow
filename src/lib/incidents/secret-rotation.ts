import type { Incident } from "../types";

export const secretRotation: Incident = {
  id: "payments-half-fleet",
  emoji: "🗝️",
  title: "Payments failing on half the fleet",
  short: "Stale credentials",
  pattern: "Secret rotation vs. credentials cached at startup",
  severity: "critical",
  difficulty: 4,
  startedAt: "03:00",
  startedAgo: "41 minutes ago",
  summary:
    "About half of all payment attempts fail with \"database unavailable\". The other half go through fine, and nothing was deployed tonight.",
  headline: [
    { label: "Failed payments", value: "49%", status: "critical" },
    { label: "Healthy tasks", value: "3 / 6", status: "warning" },
    { label: "RDS CPU", value: "22%", status: "healthy" },
    { label: "Deploys tonight", value: "0", status: "healthy" },
  ],
  resources: [
    {
      id: "alb",
      kind: "alb",
      name: "payments-alb",
      service: "Application Load Balancer",
      status: "critical",
      x: 50,
      y: 12,
      metrics: [
        { label: "HTTP 5xx", value: "49%", status: "critical", series: [0.2, 0.2, 0.3, 0.2, 0.3, 0.2, 48, 50, 49, 49, 50, 49, 48, 49] },
        { label: "Healthy targets", value: "3 / 6", status: "warning" },
        { label: "Requests / min", value: "620", status: "healthy" },
        { label: "p50 latency", value: "95ms", status: "healthy" },
      ],
      observation:
        "Almost exactly half the requests fail — the same fraction as unhealthy targets. The load balancer keeps round-robining between tasks that work and tasks that don't.",
      evidence: "alb-half",
    },
    {
      id: "secret",
      kind: "secrets",
      name: "prod/payments/db",
      service: "Secrets Manager",
      status: "warning",
      x: 16,
      y: 12,
      metrics: [
        { label: "Last rotated", value: "03:00:02", status: "warning" },
        { label: "Schedule", value: "every 30 days", status: "neutral" },
        { label: "Strategy", value: "single user", status: "warning" },
        { label: "Versions", value: "CURRENT + PREVIOUS", status: "neutral" },
      ],
      details: {
        title: "Rotation log",
        lines: [
          "03:00:01 createSecret  -> AWSPENDING created",
          "03:00:01 setSecret     -> ALTER USER payments_app PASSWORD '…'",
          "03:00:02 testSecret    -> login ok",
          "03:00:02 finishSecret  -> AWSCURRENT moved to new version",
        ],
      },
      observation:
        "The scheduled rotation ran at 03:00 and changed the database user's password in place. From that second on, only the new password is accepted.",
      evidence: "secret-rotated",
    },
    {
      id: "kms",
      kind: "kms",
      name: "alias/payments",
      service: "KMS key",
      status: "warning",
      x: 16,
      y: 46,
      metrics: [
        { label: "Key policy", value: "updated 3 days ago", status: "warning" },
        { label: "Decrypt errors", value: "0", status: "healthy" },
        { label: "Requests / hour", value: "1.2k", status: "healthy" },
        { label: "State", value: "Enabled", status: "healthy" },
      ],
      details: {
        title: "Key policy change (3 days ago)",
        lines: [
          '+ { "Sid": "AnalyticsRead",',
          '+   "Principal": { "AWS": "…:role/analytics-reader" },',
          '+   "Action": "kms:Decrypt" }',
        ],
      },
      observation:
        "The policy change added read access for an analytics role three days ago. Every decrypt call is succeeding — tasks can read the secret just fine.",
      evidence: "kms-policy",
    },
    {
      id: "ecs",
      kind: "ecs",
      name: "payments-svc",
      service: "ECS service",
      status: "critical",
      x: 50,
      y: 46,
      metrics: [
        { label: "Running tasks", value: "6 / 6", status: "neutral" },
        { label: "Failing checks", value: "3", status: "critical" },
        { label: "Image", value: "payments:2.31.0", status: "neutral", caption: "unchanged since Monday" },
        { label: "Secret read", value: "at startup", status: "warning" },
      ],
      details: {
        title: "Tasks",
        lines: [
          "task/9f1c  started 01:12  ERROR auth failed",
          "task/2a7e  started 01:12  ERROR auth failed",
          "task/c41b  started 01:13  ERROR auth failed",
          "task/77d0  started 03:24  healthy",
          "task/e0a3  started 03:24  healthy",
          "task/5b9f  started 03:25  healthy",
        ],
      },
      observation:
        "Same image, same config, and yet three tasks fail while three succeed. Compare when each task started with what else happened tonight.",
      evidence: "task-ages",
    },
    {
      id: "rds",
      kind: "rds",
      name: "payments-db",
      service: "RDS PostgreSQL",
      status: "warning",
      x: 84,
      y: 46,
      metrics: [
        { label: "CPU", value: "22%", status: "healthy" },
        { label: "Connections", value: "140 / 500", status: "healthy", bar: { value: 140, max: 500 } },
        { label: "Auth failures / min", value: "2.3k", status: "critical", series: [0, 0, 0, 0, 0, 0, 1.9, 2.2, 2.3, 2.2, 2.3, 2.4, 2.3, 2.3] },
        { label: "Maintenance", value: "pending (Sun)", status: "warning" },
      ],
      details: {
        title: "PostgreSQL log",
        lines: [
          '03:00:05 FATAL: password authentication failed for user "payments_app"',
          "         connection from 10.0.3.41",
          '03:00:05 FATAL: password authentication failed for user "payments_app"',
          "         connection from 10.0.1.17",
        ],
      },
      observation:
        "The database is healthy with plenty of headroom. It has been rejecting logins for payments_app from specific task IPs since 03:00:05. The pending maintenance is scheduled for Sunday.",
      evidence: "rds-auth",
    },
    {
      id: "scaling",
      kind: "scaling",
      name: "cpu-scaling",
      service: "Auto Scaling policy",
      status: "warning",
      x: 50,
      y: 80,
      metrics: [
        { label: "Last activity", value: "+3 tasks at 03:24", status: "warning" },
        { label: "Trigger", value: "CPU > 70%", status: "neutral" },
        { label: "Min / max", value: "3 / 12", status: "neutral" },
        { label: "Cooldown", value: "300s", status: "neutral" },
      ],
      observation:
        "Autoscaling added three tasks at 03:24 because the failing tasks retry aggressively and pushed CPU up. A reaction to the incident, not its trigger.",
      evidence: "scale-out",
    },
  ],
  edges: [
    { from: "alb", to: "ecs", status: "critical" },
    { from: "ecs", to: "rds", status: "critical" },
    { from: "secret", to: "ecs", status: "warning", dashed: true },
    { from: "kms", to: "secret", status: "neutral", dashed: true },
    { from: "scaling", to: "ecs", status: "neutral", dashed: true },
  ],
  evidence: [
    { id: "secret-rotated", label: "DB password rotated in place at 03:00", fact: "Secrets Manager single-user rotation at 03:00:02 changed payments_app password", causal: true },
    { id: "task-ages", label: "3 of 6 tasks fail auth with the same image", fact: "3 tasks started 01:12 fail auth, 3 started 03:24 healthy, same image, secret read at startup", causal: true },
    { id: "rds-auth", label: "RDS rejects payments_app logins since 03:00:05", fact: "password authentication failed for payments_app from specific task IPs, CPU 22%, 140/500 connections", causal: true },
    { id: "alb-half", label: "Half the targets unhealthy, 49% errors", fact: "ALB 3/6 healthy targets, 49% 5xx", causal: false },
    { id: "scale-out", label: "Autoscaling added 3 tasks at 03:24", fact: "scale-out +3 tasks at 03:24 due to CPU from retries", causal: false },
    { id: "kms-policy", label: "KMS policy changed 3 days ago, 0 decrypt errors", fact: "KMS key policy added analytics-reader 3 days ago, decrypt errors 0", causal: false },
  ],
  minEvidence: 5,
  timeline: [
    { time: "01:12:40", title: "Nightly task refresh", detail: "3 tasks start and read the secret", resource: "ecs", status: "neutral" },
    { time: "03:00:01", title: "Rotation started", detail: "prod/payments/db", resource: "secret", status: "warning" },
    { time: "03:00:02", title: "Secret version updated", detail: "New password is current", resource: "secret", status: "warning" },
    { time: "03:00:05", title: "Auth failures begin", detail: "payments_app rejected", resource: "rds", status: "critical" },
    { time: "03:02:30", title: "3 of 6 targets unhealthy", detail: "5xx at 49%", resource: "alb", status: "critical" },
    { time: "03:24:10", title: "Autoscaling +3 tasks", detail: "CPU above 70%", resource: "scaling", status: "warning" },
    { time: "03:40:00", title: "Error rate steady at ~49%", detail: "No recovery", resource: "alb", status: "critical" },
  ],
  rootCause: {
    title: "Stale credentials after secret rotation",
    hypothesis:
      "Secrets Manager rotated the database password at 03:00 with the single-user strategy. Tasks that started before then cached the old password at startup and never re-read the secret, so every connection they open is rejected. Tasks launched after 03:00 read the new password and work — which is why exactly the older half of the fleet fails.",
    chain: [
      "Tasks read the DB secret once, at 01:12",
      "Rotation changes the password in place at 03:00",
      "Old tasks keep using the cached password",
      "RDS rejects their logins; health checks fail",
      "Only tasks started after 03:00 can serve payments",
    ],
    confidence: "High",
  },
  suspects: [
    { id: "a", label: "The KMS policy change blocks decrypting the secret", detail: "The key policy was edited recently", correct: false, feedback: "Zero decrypt errors, and healthy tasks read the very same secret." },
    { id: "b", label: "The database is overloaded", detail: "Half the connections fail", correct: false, feedback: "CPU 22% and 140 of 500 connections. It's rejecting a password, not load." },
    { id: "c", label: "Tasks started before 03:00 still use the old password", detail: "The secret is only read at startup", correct: true, feedback: "The failing tasks predate the rotation; the healthy ones started after it." },
    { id: "d", label: "Autoscaling launched broken tasks", detail: "Three tasks were added at 03:24", correct: false, feedback: "The opposite: the tasks added at 03:24 are the healthy ones." },
  ],
  question: "What would you do?",
  options: [
    { id: "a", label: "Roll back the KMS key policy", detail: "Undo the change from three days ago", correct: false, feedback: "Decrypt works. Tasks can read the secret — they just never re-read it." },
    { id: "b", label: "Disable automatic rotation", detail: "Stop rotations from breaking the service", correct: false, feedback: "It removes a security control, and the three stale tasks stay broken anyway." },
    { id: "c", label: "Replace stale tasks and refresh the secret on auth errors", detail: "Force a new deployment now; re-read the secret on login failure (or use alternating-users rotation)", correct: true, feedback: "Old tasks pick up the current password, and future rotations stop being outages." },
    { id: "d", label: "Increase RDS max_connections", detail: "Allow more concurrent sessions", correct: false, feedback: "The database has 360 free connections. It's refusing credentials, not capacity." },
  ],
  lesson:
    "Rotation only works if clients re-read credentials. Refresh secrets on authentication failure or on a timer, or use the alternating-users strategy so the previous password stays valid until everyone has moved.",
  fallback: {
    whatsHappening:
      "About half of all payments fail while the database, the traffic and the code all look unchanged. When exactly half of a fleet fails with the same image and config, look for what differs between the tasks that fail and the ones that don't.",
    nextStepByResource: {
      ecs: "Open payments-svc and look at the individual tasks.",
      secret: "Something ran at 03:00. Open the database secret in Secrets Manager.",
      rds: "Open payments-db and read its log, not just its CPU.",
      alb: "Open the load balancer and compare the error rate with the number of healthy targets.",
      scaling: "Check the autoscaling policy — what did it do tonight, and which tasks did it create?",
      kms: "The KMS key policy changed recently. Open it and check whether decrypts are failing.",
    },
    whatChanged:
      "No deploys tonight. But two things did happen: a scheduled job ran at 03:00 and autoscaling added tasks at 03:24. A KMS policy change from three days ago is also on record. Line them up against the task start times.",
    metrics:
      "Secrets Manager rotation creates a new credential and changes it on the database. With the single-user strategy the old password stops working immediately, so any client that cached it must re-read the secret.",
    earlyRootCause:
      "I can't point at a cause yet. The strongest pattern is the split: some tasks fail, some don't. Find out what makes them different.",
    rootCause:
      "You have enough evidence. Compare when each task started with when the secret changed, and remember that the healthy tasks read the same secret through the same KMS key. Pick the explanation that fits both halves of the fleet.",
  },
  suggestedQuestions: [
    "What is happening?",
    "What should I investigate next?",
    "What changed recently?",
    "What does secret rotation do?",
    "What is the likely root cause?",
  ],
};
