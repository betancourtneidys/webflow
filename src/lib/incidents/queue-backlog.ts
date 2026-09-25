import type { Incident } from "../types";

export const queueBacklog: Incident = {
  id: "sqs-processing-delay",
  emoji: "📦",
  title: "SQS processing delay",
  short: "Queue backlog",
  pattern: "Poison messages retried forever",
  severity: "high",
  difficulty: 2,
  startedAt: "14:05",
  startedAgo: "23 minutes ago",
  summary:
    "Orders are accepted but never confirmed. Customers are receiving 'processing' emails with no follow-up.",
  headline: [
    { label: "Queue depth", value: "48,210", status: "critical" },
    { label: "Oldest message", value: "23m", status: "critical" },
    { label: "Worker errors", value: "62%", status: "critical" },
    { label: "Orders confirmed", value: "−71%", status: "warning" },
  ],
  resources: [
    {
      id: "api",
      kind: "api",
      name: "orders-api",
      service: "API Gateway",
      status: "healthy",
      x: 18,
      y: 28,
      metrics: [
        { label: "Requests / min", value: "3.1k", status: "healthy", series: [3, 3.1, 3, 3.2, 3.1, 3, 3.1, 3.2, 3.1, 3, 3.1, 3.1, 3.2, 3.1] },
        { label: "5xx", value: "0.1%", status: "healthy" },
        { label: "Latency p95", value: "84ms", status: "healthy", series: [80, 82, 81, 84, 83, 80, 82, 85, 84, 83, 82, 84, 85, 84] },
        { label: "Messages published", value: "3.1k / min", status: "healthy" },
      ],
      observation:
        "Intake looks normal: requests and publish rate are flat. The backlog is not caused by a traffic spike — messages are going in at the usual rate but not coming out.",
      evidence: "api-normal",
    },
    {
      id: "sqs",
      kind: "sqs",
      name: "orders-queue",
      service: "SQS queue",
      status: "critical",
      x: 50,
      y: 28,
      metrics: [
        { label: "Messages visible", value: "48,210", status: "critical", series: [40, 38, 45, 41, 300, 2600, 7800, 14000, 21000, 28000, 34000, 40000, 45000, 48210] },
        { label: "Age of oldest", value: "23m", status: "critical", series: [5, 4, 6, 5, 40, 120, 260, 420, 600, 790, 960, 1140, 1290, 1380] },
        { label: "Receives / msg", value: "14.6", status: "warning", caption: "average ApproximateReceiveCount" },
        { label: "Redrive to DLQ after", value: "50 tries", status: "warning" },
      ],
      observation:
        "Messages are being received many times each. They are picked up, fail, become visible again and go back into the queue — the same messages are retried over and over.",
      evidence: "sqs-depth",
    },
    {
      id: "workers",
      kind: "lambda",
      name: "order-worker",
      service: "Lambda workers",
      status: "critical",
      x: 82,
      y: 28,
      metrics: [
        { label: "Errors", value: "62%", status: "critical", series: [0.1, 0.2, 0.1, 0.2, 18, 41, 55, 60, 61, 62, 62, 61, 62, 62] },
        { label: "Successful", value: "−71%", status: "critical", series: [3, 3.1, 3, 3, 2.1, 1.4, 1, 0.9, 0.9, 0.9, 0.88, 0.9, 0.9, 0.87] },
        { label: "Duration p95", value: "310ms", status: "healthy" },
        { label: "Concurrency", value: "40%", status: "healthy", bar: { value: 40, max: 100 }, caption: "not throttled" },
      ],
      details: {
        title: "Recent logs",
        lines: [
          "14:05:12  ERROR  TypeError: order.amount.toFixed is not a function",
          "14:05:12  ERROR    at formatTotal (handler.js:48)",
          "14:05:13  INFO   Batch failed, 10 messages returned to queue",
          "14:05:14  ERROR  TypeError: order.amount.toFixed is not a function",
        ],
      },
      observation:
        "Workers are not slow or throttled — they fail fast. The error is a type error on order.amount, which points to a change in the message payload.",
      evidence: "worker-errors",
    },
    {
      id: "dlq",
      kind: "sqs",
      name: "orders-dlq",
      service: "Dead-letter queue",
      status: "warning",
      x: 50,
      y: 76,
      metrics: [
        { label: "Messages", value: "0", status: "warning" },
        { label: "maxReceiveCount", value: "50", status: "warning" },
        { label: "Alarm", value: "none", status: "warning" },
        { label: "Retention", value: "14 days", status: "neutral" },
      ],
      observation:
        "The DLQ is empty even though workers fail 62% of the time. With maxReceiveCount at 50, broken messages keep cycling through the main queue instead of being isolated.",
      evidence: "dlq-empty",
    },
    {
      id: "deploy",
      kind: "deploy",
      name: "v5.3.0",
      service: "Deployment · orders-api",
      status: "warning",
      x: 18,
      y: 76,
      metrics: [
        { label: "Deployed", value: "14:04:51", status: "neutral" },
        { label: "Service", value: "orders-api", status: "neutral" },
        { label: "Change", value: "payload v2", status: "warning" },
        { label: "Consumers updated", value: "no", status: "critical" },
      ],
      details: {
        title: "Message payload — before / after",
        lines: [
          '- "amount": 129.90',
          '+ "amount": { "value": 129.90, "currency": "ARS" }',
          '+ "schemaVersion": 2',
        ],
      },
      observation:
        "The producer started publishing schema v2, where amount is an object. The worker still expects a number.",
      evidence: "deploy-schema",
    },
    {
      id: "table",
      kind: "rds",
      name: "orders-table",
      service: "DynamoDB table",
      status: "healthy",
      x: 82,
      y: 76,
      metrics: [
        { label: "Write capacity", value: "18%", status: "healthy", bar: { value: 18, max: 100 } },
        { label: "Throttles", value: "0", status: "healthy" },
        { label: "Latency", value: "6ms", status: "healthy" },
        { label: "Writes / min", value: "0.9k", status: "neutral" },
      ],
      observation:
        "The table is healthy and far from its limits. Writes dropped only because fewer orders reach this step.",
    },
  ],
  edges: [
    { from: "api", to: "sqs", status: "healthy" },
    { from: "sqs", to: "workers", status: "critical" },
    { from: "workers", to: "table", status: "warning" },
    { from: "sqs", to: "dlq", status: "neutral", dashed: true },
    { from: "deploy", to: "api", status: "neutral", dashed: true },
  ],
  evidence: [
    { id: "worker-errors", label: "Workers fail with TypeError on order.amount", fact: "worker_error_rate_62_percent, successful_invocations_down_71_percent, TypeError order.amount.toFixed", causal: true },
    { id: "sqs-depth", label: "Queue depth 48k, messages received ~15x", fact: "queue_depth_48210, oldest_message_23m, avg_receive_count_14.6", causal: true },
    { id: "deploy-schema", label: "Producer switched to payload v2", fact: "orders-api_v5.3.0 changed amount from number to object, consumers not updated", causal: true },
    { id: "dlq-empty", label: "DLQ empty — failures loop forever", fact: "dlq_messages_0, maxReceiveCount_50", causal: true },
    { id: "api-normal", label: "Intake is flat — not a traffic spike", fact: "api_requests_flat, publish_rate_normal", causal: false },
  ],
  minEvidence: 4,
  timeline: [
    { time: "14:04:32", title: "Deployment started", detail: "orders-api v5.3.0", resource: "deploy", status: "neutral" },
    { time: "14:04:51", title: "Producer publishing v2", detail: "amount is now an object", resource: "deploy", status: "warning" },
    { time: "14:05:12", title: "Worker errors increased", detail: "TypeError on order.amount", resource: "workers", status: "critical" },
    { time: "14:06:30", title: "Queue depth rising", detail: "Visible messages 40 → 2,600", resource: "sqs", status: "critical" },
    { time: "14:11:00", title: "DLQ still empty", detail: "No alarm fired", resource: "dlq", status: "warning" },
    { time: "14:20:44", title: "Oldest message > 15m", detail: "Order confirmation SLO breached", resource: "sqs", status: "critical" },
  ],
  rootCause: {
    title: "Poison messages blocking the queue",
    hypothesis:
      "orders-api v5.3.0 started publishing a new payload format. The worker crashes on it, messages return to the queue and are retried up to 50 times, so failures accumulate and crowd out healthy messages.",
    chain: [
      "Producer deploys payload v2",
      "Worker throws TypeError on order.amount",
      "Failed batches return to the queue",
      "maxReceiveCount 50 keeps them cycling",
      "Queue depth and message age grow",
    ],
    confidence: "High",
  },
  question: "What would you do?",
  options: [
    { id: "a", label: "Scale worker concurrency", detail: "More workers to drain the queue", correct: false, feedback: "Workers aren't throttled. More workers just fail the same messages faster." },
    { id: "b", label: "Increase message retention", detail: "Keep messages longer so none are lost", correct: false, feedback: "That hides the problem. The messages still can't be processed." },
    { id: "c", label: "Fix the worker for payload v2", detail: "Handle both schemas, lower maxReceiveCount and redrive the DLQ", correct: true, feedback: "The worker processes both formats and bad messages are isolated instead of retried forever." },
    { id: "d", label: "Increase visibility timeout", detail: "Give each message more processing time", correct: false, feedback: "Workers fail in ~300ms. The timeout isn't the constraint." },
  ],
  lesson:
    "Queues hide failures. Version your message contracts, keep maxReceiveCount low and alarm on DLQ depth and message age — not only on queue size.",
  fallback: {
    whatsHappening:
      "Orders are being accepted, but the queue keeps growing and the oldest message is 23 minutes old. Messages go in at the normal rate and are not coming out. The workers are the first place to look.",
    nextStepByResource: {
      api: "Check orders-api first to rule out a traffic spike.",
      sqs: "Open orders-queue and look at how many times each message is being received.",
      workers: "Open the order-worker Lambda and read the error logs.",
      dlq: "Check the dead-letter queue. If workers fail, where do the failed messages go?",
      deploy: "Something was deployed at 14:04. Open it and compare the payload.",
    },
    whatChanged:
      "orders-api v5.3.0 was deployed at 14:04:51, twenty seconds before worker errors started. It is the producer, not the worker — check what it publishes.",
    metrics:
      "Queue depth is how many messages wait to be processed. Age of the oldest message tells you how far behind you are. A high receive count means the same messages are being retried instead of completed.",
    earlyRootCause:
      "The backlog is clearly tied to worker failures, but I can't say why they fail yet. Keep collecting evidence — the logs and recent changes should tell us.",
    rootCause:
      "The producer changed the payload format, workers crash on it, and the high maxReceiveCount keeps failed messages cycling. You have enough to build the hypothesis.",
  },
  suggestedQuestions: [
    "What is happening?",
    "What should I investigate next?",
    "What changed recently?",
    "What does receive count mean?",
    "What is the likely root cause?",
  ],
};
