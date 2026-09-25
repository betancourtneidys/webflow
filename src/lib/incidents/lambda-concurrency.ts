import type { Incident } from "../types";

export const lambdaConcurrency: Incident = {
  id: "orders-api-throttled",
  emoji: "🚦",
  title: "Orders API throttled",
  short: "Noisy neighbor",
  pattern: "A batch job starving the account's Lambda concurrency",
  severity: "critical",
  difficulty: 3,
  startedAt: "02:01",
  startedAgo: "12 minutes ago",
  summary:
    "The mobile app shows \"Something went wrong\" at checkout. It started at 2 a.m., when traffic is at its lowest of the day.",
  headline: [
    { label: "Error rate", value: "31%", status: "critical" },
    { label: "API latency p99", value: "2.9s", status: "warning" },
    { label: "DynamoDB usage", value: "92%", status: "warning" },
    { label: "Traffic", value: "−60% (night)", status: "healthy" },
  ],
  resources: [
    {
      id: "api",
      kind: "api",
      name: "orders-gateway",
      service: "API Gateway",
      status: "critical",
      x: 50,
      y: 12,
      metrics: [
        { label: "5xx", value: "31%", status: "critical", series: [0.2, 0.2, 0.3, 0.2, 0.2, 0.3, 22, 29, 31, 30, 31, 32, 31, 31] },
        { label: "Latency p99", value: "2.9s", status: "warning", series: [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 2.1, 2.7, 2.9, 2.8, 2.9, 2.9, 3, 2.9] },
        { label: "Requests / min", value: "1.1k", status: "healthy", series: [2.8, 2.5, 2.1, 1.8, 1.5, 1.3, 1.2, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1] },
        { label: "Stage throttling", value: "0", status: "healthy" },
      ],
      observation:
        "Traffic is at its nightly low, so users aren't overloading anything. API Gateway itself isn't throttling: the errors come back from the Lambda integration.",
      evidence: "api-errors",
    },
    {
      id: "deploy",
      kind: "deploy",
      name: "v3.8.1",
      service: "Deployment · orders-api",
      status: "neutral",
      x: 16,
      y: 42,
      metrics: [
        { label: "Deployed", value: "3 days ago", status: "neutral" },
        { label: "Change", value: "LOG_LEVEL=info", status: "neutral" },
        { label: "Files changed", value: "1", status: "neutral" },
        { label: "Rollback", value: "available", status: "healthy" },
      ],
      observation:
        "A config-only change from three days ago. Orders ran without errors for 72 hours after it shipped.",
      evidence: "old-deploy",
    },
    {
      id: "orders",
      kind: "lambda",
      name: "orders-api",
      service: "Lambda function",
      status: "critical",
      x: 50,
      y: 42,
      metrics: [
        { label: "Throttles", value: "41.2k", status: "critical", series: [0, 0, 0, 0, 0, 0, 9, 18, 24, 29, 33, 36, 39, 41] },
        { label: "Errors", value: "0.4%", status: "healthy", series: [0.3, 0.4, 0.3, 0.4, 0.3, 0.4, 0.4, 0.3, 0.4, 0.4, 0.3, 0.4, 0.4, 0.4] },
        { label: "Invocations / min", value: "760", status: "warning" },
        { label: "Duration p95", value: "120ms", status: "healthy" },
      ],
      details: {
        title: "Configuration",
        lines: [
          "ReservedConcurrentExecutions: (not set)",
          "Timeout: 10s",
          "MemorySize: 512",
          "LastModified: 3 days ago",
        ],
      },
      observation:
        "The function isn't failing — it isn't running. Throttles climbed while errors stayed flat: Lambda is rejecting invocations before your code even starts.",
      evidence: "orders-throttles",
    },
    {
      id: "events",
      kind: "events",
      name: "nightly-export",
      service: "EventBridge Scheduler",
      status: "warning",
      x: 84,
      y: 12,
      metrics: [
        { label: "Schedule", value: "cron(0 2 * * ? *)", status: "neutral" },
        { label: "First run", value: "today 02:00", status: "warning" },
        { label: "Target", value: "report-export", status: "neutral" },
        { label: "Created", value: "yesterday", status: "warning" },
      ],
      observation:
        "The schedule was created yesterday and fired for the first time at 02:00 — a minute before the errors.",
      evidence: "new-schedule",
    },
    {
      id: "batch",
      kind: "lambda",
      name: "report-export",
      service: "Lambda function",
      status: "critical",
      x: 84,
      y: 42,
      metrics: [
        { label: "Concurrency", value: "950", status: "critical", bar: { value: 950, max: 1000 }, caption: "account limit: 1,000" },
        { label: "Invocations", value: "38.1k", status: "warning", series: [0, 0, 0, 0, 0, 0, 12, 20, 26, 30, 33, 35, 37, 38] },
        { label: "Duration", value: "14m 50s", status: "warning" },
        { label: "Reserved concurrency", value: "none", status: "warning" },
      ],
      details: {
        title: "Function summary",
        lines: [
          "Trigger: EventBridge schedule nightly-export",
          "Fan-out: 1 invocation per customer",
          "Customers: 38,112",
          "Added in: PR #1180 (merged yesterday)",
        ],
      },
      observation:
        "The new export fans out one invocation per customer and holds ~950 concurrent executions for about 15 minutes. It has no concurrency cap.",
      evidence: "batch-concurrency",
    },
    {
      id: "dynamo",
      kind: "rds",
      name: "orders-table",
      service: "DynamoDB table",
      status: "warning",
      x: 67,
      y: 76,
      metrics: [
        { label: "Read usage", value: "92%", status: "warning", bar: { value: 92, max: 100 } },
        { label: "Throttled requests", value: "0", status: "healthy" },
        { label: "Latency", value: "7ms", status: "healthy" },
        { label: "Mode", value: "on-demand", status: "neutral" },
      ],
      observation:
        "Usage is high because something is reading every customer's orders, but there are zero throttled requests and latency is normal. The table is busy, not the bottleneck.",
      evidence: "dynamo-busy",
    },
  ],
  edges: [
    { from: "api", to: "orders", status: "critical" },
    { from: "events", to: "batch", status: "warning" },
    { from: "orders", to: "dynamo", status: "healthy" },
    { from: "batch", to: "dynamo", status: "warning" },
    { from: "deploy", to: "orders", status: "neutral", dashed: true },
  ],
  evidence: [
    { id: "orders-throttles", label: "orders-api throttled 41k times, errors flat", fact: "orders-api Throttles 41.2k since 02:01, Errors 0.4%, no reserved concurrency", causal: true },
    { id: "batch-concurrency", label: "report-export runs ~950 concurrent executions", fact: "report-export concurrency 950 of account limit 1000, 38k invocations, no reserved concurrency", causal: true },
    { id: "new-schedule", label: "New schedule fired for the first time at 02:00", fact: "EventBridge schedule nightly-export created yesterday, first run 02:00", causal: true },
    { id: "api-errors", label: "API 5xx from the Lambda integration", fact: "API Gateway 5xx 31%, stage throttling 0, traffic at nightly low", causal: false },
    { id: "dynamo-busy", label: "DynamoDB busy (92%) but zero throttles", fact: "orders-table read usage 92%, 0 throttled requests, 7ms latency", causal: false },
    { id: "old-deploy", label: "Last orders deploy was 3 days ago, config only", fact: "orders-api v3.8.1 3 days ago, LOG_LEVEL change", causal: false },
  ],
  minEvidence: 5,
  timeline: [
    { time: "02:00:00", title: "Schedule fired", detail: "nightly-export, first run", resource: "events", status: "warning" },
    { time: "02:00:40", title: "Export fans out", detail: "report-export at 950 concurrent", resource: "batch", status: "critical" },
    { time: "02:01:15", title: "orders-api throttles start", detail: "Throttles climbing, errors flat", resource: "orders", status: "critical" },
    { time: "02:01:30", title: "DynamoDB read usage 92%", detail: "No throttled requests", resource: "dynamo", status: "warning" },
    { time: "02:02:10", title: "API 5xx at 31%", detail: "Integration errors", resource: "api", status: "critical" },
    { time: "02:15:00", title: "Export still running", detail: "Estimated 15 minutes per run", resource: "batch", status: "warning" },
  ],
  rootCause: {
    title: "Lambda concurrency starvation",
    hypothesis:
      "A new nightly export fans out ~950 concurrent Lambda executions with no concurrency cap. Lambda concurrency is shared across the whole account (limit 1,000), so orders-api can't get execution slots, its invocations are throttled, and API Gateway returns them as errors.",
    chain: [
      "New schedule fires report-export at 02:00",
      "Export fans out to ~950 concurrent executions",
      "Account concurrency pool (1,000) is nearly exhausted",
      "orders-api invocations are throttled before running",
      "API Gateway returns 5xx for ~31% of requests",
    ],
    confidence: "High",
  },
  suspects: [
    { id: "a", label: "DynamoDB is throttling the orders table", detail: "Read usage is at 92%", correct: false, feedback: "Zero throttled requests and 7ms latency. The table is busy, not refusing work." },
    { id: "b", label: "The v3.8.1 config change broke orders-api", detail: "It's the last change to the function", correct: false, feedback: "It shipped three days ago and the function's own error rate is flat." },
    { id: "c", label: "The export job is using up the account's Lambda concurrency", detail: "A batch and an API share one pool", correct: true, feedback: "950 of 1,000 slots taken by the export, and orders-api is throttled — not erroring." },
    { id: "d", label: "A traffic spike is overloading API Gateway", detail: "Latency jumped to 2.9s", correct: false, feedback: "Traffic is at its nightly low and stage throttling is zero." },
  ],
  question: "What would you do?",
  options: [
    { id: "a", label: "Increase DynamoDB capacity", detail: "Give the table more read throughput", correct: false, feedback: "The table has no throttles. More capacity changes nothing for orders-api." },
    { id: "b", label: "Roll back orders-api to v3.8.0", detail: "Undo the last change", correct: false, feedback: "The code isn't running at all. A rollback is throttled just the same." },
    { id: "c", label: "Reserve concurrency for orders-api and cap the export", detail: "Guarantee slots for the API; limit the batch with reserved concurrency", correct: true, feedback: "orders-api always gets its slots, and the batch can't grow past its share of the pool." },
    { id: "d", label: "Increase the API Gateway timeout", detail: "Give the integration more time", correct: false, feedback: "Throttled invocations are rejected immediately. Waiting longer doesn't help." },
  ],
  lesson:
    "Lambda concurrency is an account-wide shared pool. Give latency-sensitive functions reserved concurrency and cap batch fan-out, or a single job can take the whole account down.",
  fallback: {
    whatsHappening:
      "Checkout errors at 31% while traffic is at its lowest of the day, and nothing was deployed tonight. When load from users drops but errors rise, look for something else competing for the same resources.",
    nextStepByResource: {
      orders: "Open the orders-api Lambda and compare its errors with its throttles.",
      batch: "Something else runs at night. Open report-export and look at its concurrency.",
      events: "Check the EventBridge schedule — when was it created, and when did it first run?",
      api: "Open API Gateway to see where the errors originate.",
      dynamo: "DynamoDB looks busy. Open it and check whether it's actually refusing requests.",
      deploy: "Open the last orders-api deployment and check when it went out.",
    },
    whatChanged:
      "No deploys tonight — the last orders-api release was three days ago. But something new ran for the first time at 02:00. Check what's scheduled.",
    metrics:
      "A Lambda throttle means the invocation was rejected before your code ran, because no concurrency slot was available. Concurrency is shared by every function in the account unless you reserve it.",
    earlyRootCause:
      "Too early to call. The interesting part is that orders-api's error rate is flat while the API fails. Keep looking at what else is running.",
    rootCause:
      "You have enough evidence. Ask yourself why a function with flat errors would still fail requests, and what else in the account was busy at 02:00. Pick the explanation that covers all of it.",
  },
  suggestedQuestions: [
    "What is happening?",
    "What should I investigate next?",
    "What changed recently?",
    "What is a Lambda throttle?",
    "What is the likely root cause?",
  ],
};
