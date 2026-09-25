import type { Incident } from "../types";

export const dnsWeightedLegacy: Incident = {
  id: "intermittent-checkout-errors",
  emoji: "🌐",
  title: "Intermittent checkout errors",
  short: "Split-brain DNS",
  pattern: "A forgotten weighted record after a region migration",
  severity: "high",
  difficulty: 3,
  startedAt: "09:03",
  startedAgo: "17 minutes ago",
  summary:
    "About one in five checkout requests fails with a 502. Retrying usually works, so support can't reproduce it on demand.",
  headline: [
    { label: "Error rate", value: "19%", status: "critical" },
    { label: "Retry success", value: "81%", status: "warning" },
    { label: "Latency p50", value: "180ms", status: "healthy" },
    { label: "Traffic", value: "4.2k / min", status: "healthy" },
  ],
  resources: [
    {
      id: "cdn",
      kind: "cdn",
      name: "shop.acme.io",
      service: "CloudFront distribution",
      status: "critical",
      x: 50,
      y: 10,
      metrics: [
        { label: "5xx", value: "19%", status: "critical", series: [0.2, 0.3, 0.2, 0.3, 0.2, 0.3, 17, 19, 18, 19, 20, 19, 18, 19] },
        { label: "Cache hit ratio", value: "41%", status: "warning", series: [88, 87, 88, 89, 88, 87, 52, 44, 42, 41, 41, 40, 41, 41] },
        { label: "Origin latency", value: "160ms", status: "healthy", series: [150, 155, 152, 158, 150, 154, 162, 158, 160, 161, 159, 160, 162, 160] },
        { label: "Requests / min", value: "4.2k", status: "healthy" },
      ],
      observation:
        "The 502s come from the origin, not the edge: CloudFront passes them through. The cache hit ratio dropped because error responses aren't cached — a side effect, not a cause. Note how steady the error rate is.",
      evidence: "cdn-5xx",
    },
    {
      id: "deploy",
      kind: "deploy",
      name: "v4.2.0",
      service: "Deployment · storefront",
      status: "warning",
      x: 16,
      y: 10,
      metrics: [
        { label: "Deployed", value: "09:01:10", status: "neutral" },
        { label: "Change", value: "CSS + images", status: "neutral" },
        { label: "Files changed", value: "41", status: "neutral" },
        { label: "Rollback", value: "available", status: "healthy" },
      ],
      details: {
        title: "Release summary",
        lines: [
          " assets/css/checkout.css      | 120 +++---",
          " assets/img/hero@2x.webp      | Bin",
          " assets/img/cart-empty.svg    |  14 +-",
          " (no server-side changes)",
        ],
      },
      observation:
        "A storefront release went out two minutes before the errors. It only touched static assets served from S3 — it can't make a load balancer answer 502.",
      evidence: "frontend-deploy",
    },
    {
      id: "dns",
      kind: "dns",
      name: "origin.acme.io",
      service: "Route 53 · weighted",
      status: "warning",
      x: 50,
      y: 37,
      metrics: [
        { label: "Records", value: "2 weighted", status: "neutral" },
        { label: "Weights", value: "80 / 20", status: "warning" },
        { label: "Evaluate target health", value: "off", status: "critical" },
        { label: "TTL", value: "60s", status: "neutral" },
      ],
      details: {
        title: "Record sets",
        lines: [
          "origin.acme.io  A  ALIAS  alb-use1-prod    weight 80",
          "origin.acme.io  A  ALIAS  alb-usw2-legacy  weight 20",
          "EvaluateTargetHealth: false",
          "HealthCheckId: (none)",
        ],
      },
      observation:
        "CloudFront resolves its origin through two weighted records. 20% of lookups get the legacy load balancer, and because target health isn't evaluated, Route 53 keeps handing it out whatever state it's in.",
      evidence: "dns-weighted",
    },
    {
      id: "alb-new",
      kind: "alb",
      name: "alb-use1-prod",
      service: "ALB · us-east-1",
      status: "healthy",
      x: 28,
      y: 63,
      metrics: [
        { label: "HTTP 5xx", value: "0.2%", status: "healthy" },
        { label: "Healthy targets", value: "12 / 12", status: "healthy" },
        { label: "Requests / min", value: "3.4k", status: "healthy", series: [0.1, 0.1, 0.2, 0.1, 0.1, 2.9, 3.3, 3.4, 3.4, 3.3, 3.4, 3.4, 3.4, 3.4] },
        { label: "p99", value: "210ms", status: "healthy" },
      ],
      observation:
        "The new load balancer is fine: every target healthy and almost no errors. It carries about 80% of the traffic.",
      evidence: "alb-new-healthy",
    },
    {
      id: "alb-legacy",
      kind: "alb",
      name: "alb-usw2-legacy",
      service: "ALB · us-west-2",
      status: "critical",
      x: 72,
      y: 63,
      metrics: [
        { label: "HTTP 502", value: "100%", status: "critical" },
        { label: "Healthy targets", value: "0 / 0", status: "critical" },
        { label: "Requests / min", value: "840", status: "warning", series: [4.1, 4.2, 4.1, 4.2, 4.1, 0.9, 0.85, 0.84, 0.84, 0.85, 0.84, 0.84, 0.83, 0.84] },
        { label: "Created", value: "2 years ago", status: "neutral" },
      ],
      details: {
        title: "Access logs",
        lines: [
          'elb_status_code=502 target=- "GET /checkout"',
          'elb_status_code=502 target=- "POST /api/cart"',
          'elb_status_code=502 target=- "GET /checkout/confirm"',
          "error_reason=NoRegisteredTargets",
        ],
      },
      observation:
        "Every request here fails: the target group is empty. Yet it still receives ~840 requests a minute — roughly a fifth of all traffic.",
      evidence: "alb-legacy-empty",
    },
    {
      id: "ecs-new",
      kind: "ecs",
      name: "checkout-use1",
      service: "ECS service · us-east-1",
      status: "warning",
      x: 28,
      y: 89,
      metrics: [
        { label: "Tasks", value: "12 / 12", status: "healthy" },
        { label: "CPU", value: "78%", status: "warning", series: [31, 30, 32, 31, 30, 64, 72, 76, 77, 78, 77, 78, 79, 78] },
        { label: "Memory", value: "61%", status: "healthy" },
        { label: "Throttled", value: "0", status: "healthy" },
      ],
      observation:
        "CPU climbed because this region now serves most of the traffic, but tasks are healthy and nothing is throttled. Busy is not broken.",
      evidence: "ecs-busy",
    },
    {
      id: "ecs-legacy",
      kind: "ecs",
      name: "checkout-usw2",
      service: "ECS service · us-west-2",
      status: "critical",
      x: 72,
      y: 89,
      metrics: [
        { label: "Desired tasks", value: "0", status: "critical" },
        { label: "Running", value: "0", status: "critical" },
        { label: "Last change", value: "09:02 today", status: "warning" },
        { label: "Changed by", value: "runbook", status: "neutral" },
      ],
      details: {
        title: "CloudTrail event",
        lines: [
          '"eventName": "UpdateService"',
          '"requestParameters": { "desiredCount": 0 }',
          '"userIdentity": { "arn": "…:assumed-role/migration-runbook" }',
          '"eventTime": "09:02:14Z"',
        ],
      },
      observation:
        "The migration runbook scaled the legacy service to zero at 09:02 — step 7 of the cutover. Step 8 was to remove the legacy DNS record.",
      evidence: "legacy-scaled-down",
    },
  ],
  edges: [
    { from: "cdn", to: "dns", status: "warning" },
    { from: "dns", to: "alb-new", status: "healthy" },
    { from: "dns", to: "alb-legacy", status: "critical" },
    { from: "alb-new", to: "ecs-new", status: "healthy" },
    { from: "alb-legacy", to: "ecs-legacy", status: "neutral", dashed: true },
    { from: "deploy", to: "cdn", status: "neutral", dashed: true },
  ],
  evidence: [
    { id: "dns-weighted", label: "Origin DNS splits 80 / 20, target health off", fact: "origin.acme.io weighted 80/20 to use1/usw2, EvaluateTargetHealth false", causal: true },
    { id: "alb-legacy-empty", label: "Legacy ALB has no targets, 100% 502", fact: "alb-usw2-legacy 0 targets, 502 on every request, ~840 req/min", causal: true },
    { id: "legacy-scaled-down", label: "Runbook scaled legacy region to 0 at 09:02", fact: "checkout-usw2 desiredCount 0 at 09:02 by migration-runbook (step 7 of 8)", causal: true },
    { id: "cdn-5xx", label: "Edge 5xx steady at ~19%", fact: "cloudfront 5xx 19% steady, cache hit ratio dropped because errors aren't cached", causal: false },
    { id: "alb-new-healthy", label: "us-east-1 ALB healthy, ~80% of traffic", fact: "alb-use1-prod 12/12 healthy, 0.2% 5xx, 3.4k req/min", causal: false },
    { id: "ecs-busy", label: "New region busy (CPU 78%) but healthy", fact: "checkout-use1 CPU 78%, 12/12 tasks, no throttling", causal: false },
    { id: "frontend-deploy", label: "Frontend release only changed static assets", fact: "storefront v4.2.0 at 09:01, CSS and images only", causal: false },
  ],
  minEvidence: 5,
  timeline: [
    { time: "08:40:00", title: "Migration cutover started", detail: "Runbook: move checkout to us-east-1", resource: "ecs-legacy", status: "neutral" },
    { time: "08:52:31", title: "DNS weights set to 80 / 20", detail: "Canary step on origin.acme.io", resource: "dns", status: "warning" },
    { time: "09:01:10", title: "Storefront v4.2.0 deployed", detail: "CSS and image updates", resource: "deploy", status: "neutral" },
    { time: "09:02:14", title: "Legacy service scaled to 0", detail: "checkout-usw2 desiredCount 0", resource: "ecs-legacy", status: "warning" },
    { time: "09:02:40", title: "Legacy targets drained", detail: "Target group now empty", resource: "alb-legacy", status: "critical" },
    { time: "09:03:05", title: "Edge 5xx jumps to 19%", detail: "Steady ever since", resource: "cdn", status: "critical" },
    { time: "09:10:00", title: "Runbook step 8 pending", detail: "Remove legacy DNS record", resource: "dns", status: "warning" },
  ],
  rootCause: {
    title: "Weighted DNS still routing to a drained region",
    hypothesis:
      "The migration runbook scaled the legacy region to zero but never removed its weighted Route 53 record. With target health not evaluated, 20% of origin lookups still resolve to an empty load balancer that answers 502 — so roughly one request in five fails, and a retry usually lands on the healthy region.",
    chain: [
      "Runbook shifts origin weights to 80 / 20",
      "Legacy ECS service scaled to 0 at 09:02",
      "Legacy ALB has no targets and returns 502",
      "Route 53 ignores target health and keeps answering with it",
      "~20% of requests fail; retries mostly succeed",
    ],
    confidence: "High",
  },
  suspects: [
    { id: "a", label: "The storefront release broke checkout", detail: "v4.2.0 shipped two minutes before the errors", correct: false, feedback: "It only changed static assets, and the 502s come from a load balancer." },
    { id: "b", label: "us-east-1 can't handle the migrated traffic", detail: "CPU is at 78% after the cutover", correct: false, feedback: "12/12 healthy targets and 0.2% errors. That region is busy, not failing." },
    { id: "c", label: "DNS still sends a fifth of the traffic to an empty region", detail: "The legacy record outlived the service behind it", correct: true, feedback: "The 20% weight, the empty legacy target group and the ~19% error rate all line up." },
    { id: "d", label: "CloudFront is serving cached errors", detail: "The cache hit ratio collapsed at the same time", correct: false, feedback: "Errors aren't being cached — that's exactly why the hit ratio dropped." },
  ],
  question: "What would you do?",
  options: [
    { id: "a", label: "Roll back storefront v4.2.0", detail: "Undo the most recent release", correct: false, feedback: "Static assets can't make a load balancer return 502. Errors would continue." },
    { id: "b", label: "Scale out checkout-use1", detail: "Add tasks to the new region", correct: false, feedback: "The new region isn't failing. The broken path is the one DNS still points to." },
    { id: "c", label: "Invalidate the CloudFront cache", detail: "Flush whatever the edge is holding", correct: false, feedback: "Error responses aren't cached, so there's nothing to flush." },
    { id: "d", label: "Remove the legacy weighted record", detail: "And enable Evaluate Target Health on the remaining one", correct: true, feedback: "All lookups resolve to the healthy region, and an empty target can't be handed out again." },
  ],
  lesson:
    "Weighted and failover records only protect you when they evaluate target health. In migrations, make \"remove the old record\" part of the same change that drains the old region.",
  fallback: {
    whatsHappening:
      "About 19% of checkout requests fail with 502 while latency and traffic look normal. A steady, partial error rate that disappears on retry usually means some requests take a different path than others. Look for where the traffic splits.",
    nextStepByResource: {
      cdn: "Start at the edge: open the CloudFront distribution and look at how the error rate behaves over time.",
      dns: "CloudFront reaches its origin through DNS. Open origin.acme.io and check how it answers.",
      "alb-legacy": "There are two load balancers. Open the legacy one and compare it with the new one.",
      "ecs-legacy": "Check the legacy ECS service — what happened to it during the migration?",
      "alb-new": "Open the us-east-1 load balancer to see whether the new region is healthy.",
      "ecs-new": "Open checkout-use1 and decide whether its CPU is a cause or a consequence.",
      deploy: "A release went out at 09:01. Open it and check what it touched.",
    },
    whatChanged:
      "Three things changed within twenty minutes: DNS weights at 08:52, a storefront release at 09:01 and the legacy service scale-down at 09:02. Only some of them can make a load balancer return 502 — check each one.",
    metrics:
      "Weighted routing splits DNS answers by percentage. If Evaluate Target Health is off, Route 53 keeps returning a record even when nothing healthy sits behind it — so a fixed share of clients keeps failing.",
    earlyRootCause:
      "Not enough to say yet. A steady ~19% failure rate is a strong pattern, though. Find out which part of the system handles about a fifth of the traffic.",
    rootCause:
      "You have what you need. Compare the error rate with the DNS weights, and check what's left behind the load balancer that gets the smaller share. Then pick the explanation that fits every signal, not just one.",
  },
  suggestedQuestions: [
    "What is happening?",
    "What should I investigate next?",
    "What changed recently?",
    "Why would a retry work?",
    "What is the likely root cause?",
  ],
};
