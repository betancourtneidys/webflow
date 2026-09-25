import type { Incident } from "../types";

export const dbExhaustion: Incident = {
  id: "production-api-degraded",
  emoji: "🔥",
  title: "Production API degraded",
  short: "Database exhaustion",
  pattern: "Connection pool exhaustion after a deploy",
  severity: "critical",
  difficulty: 1,
  startedAt: "08:42",
  startedAgo: "8 minutes ago",
  summary:
    "Checkout requests are slow and failing. Customers report timeouts on payment confirmation.",
  headline: [
    { label: "API latency", value: "4.8s", status: "critical" },
    { label: "Error rate", value: "38%", status: "critical" },
    { label: "RDS connections", value: "97%", status: "warning" },
    { label: "SQS backlog", value: "12,481", status: "warning" },
  ],
  resources: [
    {
      id: "alb",
      kind: "alb",
      name: "payments-alb",
      service: "Application Load Balancer",
      status: "critical",
      x: 50,
      y: 13,
      metrics: [
        { label: "p99 latency", value: "4.8s", status: "critical", series: [0.3, 0.3, 0.32, 0.31, 0.3, 0.33, 0.9, 1.8, 2.6, 3.4, 3.9, 4.3, 4.6, 4.8] },
        { label: "HTTP 5xx", value: "38%", status: "critical", series: [0.4, 0.5, 0.4, 0.5, 0.4, 0.6, 6, 14, 22, 29, 33, 36, 37, 38] },
        { label: "Requests / min", value: "11.2k", status: "healthy", series: [10.8, 11, 11.1, 10.9, 11.3, 11.2, 11, 11.4, 11.1, 11.2, 11.3, 11, 11.2, 11.2] },
        { label: "Healthy targets", value: "2 / 2", status: "healthy" },
      ],
      observation:
        "Traffic is flat, so this is not a load spike. The ALB is healthy but its targets are slow and returning 5xx: the problem is behind the load balancer.",
      evidence: "alb-latency",
    },
    {
      id: "lambda",
      kind: "lambda",
      name: "payments-api",
      service: "Lambda function",
      status: "critical",
      x: 50,
      y: 46,
      metrics: [
        { label: "Invocations", value: "184k", status: "healthy", series: [170, 172, 175, 171, 176, 178, 180, 181, 183, 182, 184, 183, 184, 184] },
        { label: "Errors", value: "38%", status: "critical", series: [0.2, 0.3, 0.2, 0.3, 0.2, 0.4, 5, 13, 21, 28, 33, 36, 37, 38] },
        { label: "Duration p95", value: "4.2s", status: "critical", series: [0.18, 0.2, 0.19, 0.2, 0.21, 0.2, 1.1, 2.2, 3, 3.6, 3.9, 4.1, 4.2, 4.2] },
        { label: "Concurrency", value: "91%", status: "warning", bar: { value: 910, max: 1000 }, caption: "910 / 1,000 reserved" },
      ],
      details: {
        title: "Recent logs",
        lines: [
          "08:43:02  ERROR  SequelizeConnectionError: too many connections",
          "08:43:04  ERROR  Task timed out after 5.00 seconds",
          "08:43:05  WARN   pool.acquire() waited 3,912ms",
          "08:43:09  ERROR  SequelizeConnectionError: too many connections",
        ],
      },
      observation:
        "The error rate jumped right after the latest deployment. Several errors mention 'too many connections' — the function is waiting on the database rather than failing on its own logic.",
      evidence: "lambda-errors",
    },
    {
      id: "rds",
      kind: "rds",
      name: "payments-db",
      service: "RDS PostgreSQL",
      status: "warning",
      x: 28,
      y: 80,
      metrics: [
        { label: "Connections", value: "487 / 500", status: "critical", bar: { value: 487, max: 500 }, caption: "max_connections = 500" },
        { label: "CPU", value: "71%", status: "warning", series: [28, 30, 29, 31, 30, 32, 44, 55, 61, 66, 68, 70, 71, 71] },
        { label: "Read latency", value: "820ms", status: "warning", series: [8, 9, 8, 9, 10, 9, 120, 310, 480, 600, 700, 760, 800, 820] },
        { label: "Write latency", value: "1.2s", status: "critical", series: [12, 13, 12, 14, 13, 12, 180, 420, 690, 880, 1000, 1100, 1150, 1200] },
      ],
      observation:
        "Database connections are approaching the configured limit. CPU is elevated but not saturated, which suggests the database is overwhelmed by connection count, not by query volume.",
      evidence: "rds-connections",
    },
    {
      id: "sqs",
      kind: "sqs",
      name: "payment-events",
      service: "SQS queue",
      status: "warning",
      x: 72,
      y: 80,
      metrics: [
        { label: "Messages visible", value: "12,481", status: "warning", series: [120, 110, 130, 125, 118, 140, 900, 2800, 5200, 7600, 9400, 10900, 11800, 12481] },
        { label: "Oldest message", value: "6m 40s", status: "warning" },
        { label: "Consumers", value: "healthy", status: "healthy" },
        { label: "DLQ", value: "0", status: "healthy" },
      ],
      observation:
        "The backlog grows because payment events are published only after a successful DB write. It is a downstream symptom: the queue itself and its consumers look healthy.",
      evidence: "sqs-backlog",
    },
    {
      id: "deploy",
      kind: "deploy",
      name: "v2.14.0",
      service: "Deployment · payments-api",
      status: "warning",
      x: 16,
      y: 46,
      metrics: [
        { label: "Deployed", value: "08:42:34", status: "neutral" },
        { label: "Author", value: "ci-bot", status: "neutral" },
        { label: "Files changed", value: "3", status: "neutral" },
        { label: "Rollback", value: "available", status: "healthy" },
      ],
      details: {
        title: "src/db.ts — diff",
        lines: [
          "- const pool = createPool({ max: 2 })",
          "  export const handler = async (event) => {",
          "+   const pool = createPool({ max: 10 })",
          "    const tx = await pool.transaction()",
        ],
      },
      observation:
        "This change moved the connection pool inside the handler and raised its size from 2 to 10. Every invocation now opens its own pool instead of reusing one.",
      evidence: "deploy-change",
    },
  ],
  edges: [
    { from: "alb", to: "lambda", status: "critical" },
    { from: "lambda", to: "rds", status: "critical" },
    { from: "lambda", to: "sqs", status: "warning" },
    { from: "deploy", to: "lambda", status: "neutral", dashed: true },
  ],
  evidence: [
    { id: "lambda-errors", label: "Lambda errors spiked to 38% after deploy", fact: "lambda_error_rate_38_percent, logs show 'too many connections'", causal: true },
    { id: "rds-connections", label: "RDS connections at 487 / 500", fact: "rds_connections_487_of_500, cpu_71_percent, write_latency_1200ms", causal: true },
    { id: "deploy-change", label: "Deploy moved DB pool into the handler", fact: "deployment_v2.14.0_8_minutes_ago moved createPool inside handler, max 2 -> 10", causal: true },
    { id: "alb-latency", label: "ALB latency 4.8s with flat traffic", fact: "alb_p99_4.8s, 5xx_38_percent, requests_per_minute_flat", causal: false },
    { id: "sqs-backlog", label: "SQS backlog is a downstream symptom", fact: "sqs_backlog_12481, consumers_healthy, events_published_after_db_write", causal: false },
  ],
  minEvidence: 4,
  timeline: [
    { time: "08:42:11", title: "Deployment started", detail: "payments-api v2.14.0 via GitHub Actions", resource: "deploy", status: "neutral" },
    { time: "08:42:34", title: "Lambda updated", detail: "New version live on alias prod", resource: "deploy", status: "warning" },
    { time: "08:43:02", title: "Error rate increased", detail: "Lambda errors 0.3% → 13%", resource: "lambda", status: "critical" },
    { time: "08:43:19", title: "RDS connections increased", detail: "140 → 450 in 17 seconds", resource: "rds", status: "critical" },
    { time: "08:43:40", title: "Queue backlog growing", detail: "payment-events visible messages rising", resource: "sqs", status: "warning" },
    { time: "08:44:01", title: "API latency increased", detail: "ALB p99 above 2s SLO", resource: "alb", status: "critical" },
  ],
  rootCause: {
    title: "Database connection exhaustion",
    hypothesis:
      "The latest Lambda deployment creates a new connection pool on every invocation. With ~900 concurrent executions each holding connections, RDS hits max_connections and new requests queue until they time out.",
    chain: [
      "v2.14.0 moved createPool() inside the handler",
      "Each concurrent Lambda opens its own pool",
      "RDS reaches 487 / 500 connections",
      "Queries wait for a free connection and time out",
      "API returns 5xx and latency climbs to 4.8s",
    ],
    confidence: "High",
  },
  question: "What would you do?",
  options: [
    { id: "a", label: "Increase Lambda timeout", detail: "Give each invocation more time to finish", correct: false, feedback: "Longer timeouts keep connections open even longer and make the exhaustion worse." },
    { id: "b", label: "Increase RDS instance size", detail: "Scale up to raise max_connections", correct: false, feedback: "It buys a few minutes, but connections still grow with concurrency. The leak is in the code path." },
    { id: "c", label: "Fix database connection handling", detail: "Reuse one pool at module scope (or use RDS Proxy) and roll back v2.14.0", correct: true, feedback: "Connections are reused across invocations and stop scaling with concurrency." },
    { id: "d", label: "Increase SQS visibility timeout", detail: "Give consumers more time per message", correct: false, feedback: "The queue is a symptom. Its consumers are healthy." },
  ],
  lesson:
    "In serverless, connections scale with concurrency. Create clients outside the handler and put a pooler like RDS Proxy in front of relational databases.",
  fallback: {
    whatsHappening:
      "The API is experiencing elevated errors and latency while traffic is flat. Two signals stand out: Lambda errors increased right after the latest deployment, and RDS connections are approaching their configured limit. Investigating the database connection pattern may help narrow down the cause.",
    nextStepByResource: {
      alb: "Start at the edge: open the ALB to confirm whether this is a traffic spike or something behind the load balancer.",
      lambda: "Open the payments-api Lambda. Compare its error rate and logs with the deployment time.",
      rds: "Check payments-db. Look at connections versus max_connections, not only CPU.",
      deploy: "Something changed at 08:42. Open the deployment and read the diff.",
      sqs: "The SQS backlog is growing. Check whether the queue is a cause or a symptom.",
    },
    whatChanged:
      "payments-api v2.14.0 was deployed at 08:42:34, about 30 seconds before errors started. The timing is a strong signal — open the deployment node to see what the diff touched.",
    metrics:
      "Connections tell you how many clients hold a session with the database. When they approach max_connections, new queries wait for a free slot. That waiting shows up upstream as Lambda duration, timeouts and API latency.",
    earlyRootCause:
      "I don't want to jump to conclusions yet. The errors correlate with the deployment and with rising database connections, but we need more evidence to connect them. Keep inspecting the resources on the diagram.",
    rootCause:
      "The evidence lines up: v2.14.0 creates a connection pool per invocation, concurrency is at 91%, and RDS is at 487 of 500 connections. Lambda is exhausting the database connections. You have enough to build the hypothesis.",
  },
  suggestedQuestions: [
    "What is happening?",
    "What should I investigate next?",
    "What changed recently?",
    "Why is RDS relevant?",
    "What is the likely root cause?",
  ],
};
