import type { Incident } from "../types";

export const oidcTrust: Incident = {
  id: "deployment-failure",
  emoji: "🔐",
  title: "Deployment failure",
  short: "IAM deployment failure",
  pattern: "OIDC subject mismatch in an IAM trust policy",
  severity: "high",
  difficulty: 3,
  startedAt: "10:14",
  startedAgo: "31 minutes ago",
  summary:
    "A security hotfix can't reach production. Every deploy since this morning aborts before touching AWS.",
  headline: [
    { label: "Deploys failed", value: "4 / 4", status: "critical" },
    { label: "AssumeRole denied", value: "4", status: "critical" },
    { label: "Prod version", value: "v1.8.2", status: "warning" },
    { label: "Hotfix blocked", value: "31m", status: "warning" },
  ],
  resources: [
    {
      id: "github",
      kind: "github",
      name: "deploy-prod.yml",
      service: "GitHub Actions",
      status: "critical",
      x: 16,
      y: 24,
      metrics: [
        { label: "Last 4 runs", value: "failed", status: "critical" },
        { label: "Failing step", value: "aws-credentials", status: "critical", caption: "configure-aws-credentials@v4" },
        { label: "Duration", value: "14s", status: "neutral" },
        { label: "Workflow changed", value: "PR #412", status: "warning" },
      ],
      details: {
        title: "Job log",
        lines: [
          "Run aws-actions/configure-aws-credentials@v4",
          "  role-to-assume: arn:aws:iam::4021…:role/gh-deploy-prod",
          "Error: Not authorized to perform sts:AssumeRoleWithWebIdentity",
          "Error: Process completed with exit code 1.",
          "",
          "PR #412 (merged 10:12): + environment: production",
        ],
      },
      observation:
        "The job never reaches AWS: it fails while exchanging the GitHub token for AWS credentials. The workflow was edited minutes before the first failure — PR #412 added a deployment environment.",
      evidence: "workflow-failed",
    },
    {
      id: "oidc",
      kind: "oidc",
      name: "OIDC token",
      service: "GitHub identity token",
      status: "warning",
      x: 50,
      y: 24,
      metrics: [
        { label: "Token issued", value: "yes", status: "healthy" },
        { label: "aud", value: "sts.amazonaws.com", status: "healthy" },
        { label: "Provider thumbprint", value: "valid", status: "healthy" },
        { label: "sub format", value: "environment", status: "warning" },
      ],
      details: {
        title: "Token claims",
        lines: [
          '"iss": "https://token.actions.githubusercontent.com"',
          '"aud": "sts.amazonaws.com"',
          '"sub": "repo:acme/payments-api:environment:production"',
          '"ref": "refs/heads/main"',
          '"environment": "production"',
        ],
      },
      observation:
        "GitHub issues a valid token. When a job uses an environment, the sub claim becomes repo:…:environment:production instead of repo:…:ref:refs/heads/main.",
      evidence: "token-claims",
    },
    {
      id: "sts",
      kind: "sts",
      name: "AssumeRole",
      service: "AWS STS · CloudTrail",
      status: "critical",
      x: 84,
      y: 24,
      metrics: [
        { label: "Calls", value: "4", status: "neutral", series: [0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4] },
        { label: "errorCode", value: "AccessDenied", status: "critical" },
        { label: "Successful", value: "0", status: "critical" },
        { label: "Source", value: "GitHub OIDC", status: "neutral" },
      ],
      details: {
        title: "CloudTrail event",
        lines: [
          '"eventName": "AssumeRoleWithWebIdentity"',
          '"errorCode": "AccessDenied"',
          '"errorMessage": "Not authorized to perform',
          '   sts:AssumeRoleWithWebIdentity"',
          '"userIdentity": { "type": "WebIdentityUser",',
          '   "userName": "repo:acme/payments-api:environment:production" }',
        ],
      },
      observation:
        "STS received the token and rejected it. AccessDenied here means the role's trust policy didn't match the token — the permission policy is never evaluated.",
      evidence: "cloudtrail-denied",
    },
    {
      id: "iam",
      kind: "iam",
      name: "gh-deploy-prod",
      service: "IAM role",
      status: "critical",
      x: 84,
      y: 74,
      metrics: [
        { label: "Trust policy", value: "OIDC federated", status: "neutral" },
        { label: "Last modified", value: "3 months ago", status: "neutral" },
        { label: "Condition", value: "StringEquals sub", status: "warning" },
        { label: "Last used", value: "yesterday", status: "neutral" },
      ],
      details: {
        title: "Trust policy — Condition",
        lines: [
          '"StringEquals": {',
          '  "…githubusercontent.com:aud":',
          '    "sts.amazonaws.com",',
          '  "…githubusercontent.com:sub":',
          '    "repo:acme/payments-api:ref:refs/heads/main"',
          "}",
        ],
      },
      observation:
        "The trust policy only accepts the ref:refs/heads/main subject. The token now carries environment:production, so the StringEquals condition fails.",
      evidence: "trust-policy",
    },
    {
      id: "ecs",
      kind: "ecs",
      name: "payments-prod",
      service: "ECS service",
      status: "healthy",
      x: 50,
      y: 74,
      metrics: [
        { label: "Running version", value: "v1.8.2", status: "warning" },
        { label: "Tasks", value: "6 / 6", status: "healthy" },
        { label: "CPU", value: "34%", status: "healthy", series: [30, 32, 35, 33, 31, 34, 36, 33, 32, 35, 34, 33, 35, 34] },
        { label: "Last deploy", value: "yesterday", status: "neutral" },
      ],
      observation:
        "Production is healthy but frozen on yesterday's version. Nothing is broken at runtime — the pipeline can't get credentials to ship the hotfix.",
      evidence: "prod-unchanged",
    },
  ],
  edges: [
    { from: "github", to: "oidc", status: "healthy" },
    { from: "oidc", to: "sts", status: "warning" },
    { from: "sts", to: "iam", status: "critical" },
    { from: "iam", to: "ecs", status: "critical", dashed: true },
  ],
  evidence: [
    { id: "workflow-failed", label: "Deploy fails at configure-aws-credentials", fact: "4_of_4_runs_failed at sts:AssumeRoleWithWebIdentity, PR #412 added environment: production", causal: true },
    { id: "token-claims", label: "Token sub is environment:production", fact: "sub=repo:acme/payments-api:environment:production, aud=sts.amazonaws.com", causal: true },
    { id: "cloudtrail-denied", label: "CloudTrail: AssumeRoleWithWebIdentity AccessDenied", fact: "cloudtrail AssumeRoleWithWebIdentity errorCode AccessDenied x4", causal: true },
    { id: "trust-policy", label: "Trust policy only allows ref:refs/heads/main", fact: "trust_policy StringEquals sub=repo:acme/payments-api:ref:refs/heads/main", causal: true },
    { id: "prod-unchanged", label: "Prod healthy but stuck on v1.8.2", fact: "ecs_running_v1.8.2, tasks_healthy", causal: false },
  ],
  minEvidence: 4,
  timeline: [
    { time: "10:12:40", title: "PR #412 merged", detail: "Adds environment: production to the deploy job", resource: "github", status: "warning" },
    { time: "10:14:02", title: "Deployment started", detail: "deploy-prod.yml on main", resource: "github", status: "neutral" },
    { time: "10:14:09", title: "OIDC token issued", detail: "sub claim now uses the environment", resource: "oidc", status: "neutral" },
    { time: "10:14:10", title: "AssumeRole denied", detail: "CloudTrail: AccessDenied", resource: "sts", status: "critical" },
    { time: "10:14:11", title: "Trust policy evaluated", detail: "Condition sub did not match", resource: "iam", status: "critical" },
    { time: "10:14:16", title: "Deployment aborted", detail: "Production remains on v1.8.2", resource: "ecs", status: "warning" },
  ],
  rootCause: {
    title: "IAM trust policy rejects the OIDC subject",
    hypothesis:
      "PR #412 added a GitHub environment to the deploy job, which changes the token's sub claim to repo:acme/payments-api:environment:production. The role's trust policy still requires ref:refs/heads/main, so STS denies AssumeRoleWithWebIdentity.",
    chain: [
      "PR #412 adds environment: production",
      "GitHub issues sub = …:environment:production",
      "Trust policy expects …:ref:refs/heads/main",
      "STS returns AccessDenied",
      "Deploy aborts before reaching AWS",
    ],
    confidence: "High",
  },
  question: "What would you do?",
  options: [
    { id: "a", label: "Attach AdministratorAccess to the role", detail: "Make sure the role can do everything", correct: false, feedback: "Permission policies are never evaluated — the role can't even be assumed. And it's a huge blast radius." },
    { id: "b", label: "Use long-lived access keys", detail: "Store an IAM user key in GitHub secrets", correct: false, feedback: "It unblocks the deploy by throwing away OIDC. Static keys leak and never expire." },
    { id: "c", label: "Update the trust policy subject", detail: "Allow repo:acme/payments-api:environment:production in the sub condition", correct: true, feedback: "The role trusts exactly the subject the workflow now presents — still scoped to one repo and one environment." },
    { id: "d", label: "Increase the role's max session duration", detail: "Sessions may be expiring too fast", correct: false, feedback: "No session is ever created. Duration is irrelevant when the trust check fails." },
  ],
  lesson:
    "The OIDC sub claim depends on how the job runs: branch, tag, pull request or environment. Any workflow change can change it — check CloudTrail's userName to see the exact subject AWS received.",
  fallback: {
    whatsHappening:
      "Production is running fine, but every deployment since 10:14 fails before reaching AWS. The pipeline can't obtain credentials, so the problem is in the identity chain between GitHub and the IAM role.",
    nextStepByResource: {
      github: "Open the GitHub Actions workflow and read the failing step.",
      oidc: "Inspect the OIDC token. Which claims is GitHub sending?",
      sts: "Look at the CloudTrail event for AssumeRoleWithWebIdentity.",
      iam: "Open the IAM role and read the trust policy conditions.",
      ecs: "Check the production service to understand the customer impact.",
    },
    whatChanged:
      "PR #412 was merged at 10:12, two minutes before the first failure. It changed the deploy workflow itself — worth checking what that does to the token GitHub issues.",
    metrics:
      "AssumeRoleWithWebIdentity exchanges a GitHub OIDC token for temporary AWS credentials. AWS first checks the role's trust policy against the token claims (iss, aud, sub). If that fails you get AccessDenied, no matter what permissions the role has.",
    earlyRootCause:
      "It's too early to point at a single cause. We know AWS denies the credential exchange, but not why yet. Compare what the token says with what the role expects.",
    rootCause:
      "The token's sub is repo:acme/payments-api:environment:production, but the trust policy only allows ref:refs/heads/main. That mismatch is why STS denies the role. You have enough to build the hypothesis.",
  },
  suggestedQuestions: [
    "What is happening?",
    "What should I investigate next?",
    "What changed recently?",
    "What is the sub claim?",
    "What is the likely root cause?",
  ],
};
