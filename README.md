# Cloud Detective

**Production is broken. Find out why.**

Cloud Detective turns cloud incident response into an investigation. You get a simulated AWS production incident, explore an interactive architecture, inspect metrics, logs and the timeline, collect evidence, and pick the fix for the root cause. Built for the Nerdearla App Showcase.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run lint
npm run build
```

No AWS account and no API key are needed. Every incident runs from local data.

## Incidents

| Incident | Pattern | Architecture |
| --- | --- | --- |
| 🔥 Production API degraded | Database connection exhaustion after a deploy | ALB → Lambda → RDS / SQS |
| 📦 SQS processing delay | Poison messages retried forever | API → SQS → Lambda workers → DynamoDB |
| 🔐 Deployment failure | OIDC `sub` mismatch in an IAM trust policy | GitHub Actions → OIDC → STS → IAM role → ECS |
| 🌐 Intermittent checkout errors | Weighted DNS still routing to a drained region | CloudFront → Route 53 → two ALBs → ECS |
| 🚦 Orders API throttled | A batch job starving account-wide Lambda concurrency | API Gateway → Lambda ← EventBridge batch → DynamoDB |
| 🗝️ Payments failing on half the fleet | Stale DB credentials after Secrets Manager rotation | ALB → ECS → RDS, Secrets Manager, KMS |

The last three are harder: more red herrings, and the player must pick the root cause among four suspects before it is revealed.

## How it works

- **Scenarios** live in `src/lib/incidents/*.ts`, typed by `src/lib/types.ts`. Each one declares its resources (with diagram positions, metrics, logs and the evidence they reveal), edges, timeline, root cause, optional suspects, resolution options and fallback assistant answers. To add an incident, create a file, add its Spanish overlay in `src/lib/incidents/es/`, and register both in `src/lib/incidents/index.ts`.
- **Languages.** English lives at `/`, Spanish at `/es` (both prerendered). UI strings are in `src/lib/i18n.ts`; the `Messages` type makes a missing Spanish key a compile error. Incident translations are partial overlays merged over the English source: arrays follow the English order (include `id`s), and anything left out — numbers, resource names, logs — falls through unchanged.
- **Scoring is deterministic.** Evidence, the hypothesis threshold (`minEvidence`) and the correct option all come from the scenario. The LLM never decides whether you solved it.
- **Assistant.** `POST /api/assistant` calls Claude (`ANTHROPIC_API_KEY`) or Gemini (`GEMINI_API_KEY`, free tier works) with the incident context — see `src/lib/llm.ts` and `.env.example`. Until you have `minEvidence`, the prompt contains neither the root cause nor the details of resources you haven't inspected, so it can't give the answer away.
- **Demo mode.** If no key is set, or the provider fails, times out, refuses or runs out of quota, the route (and, if the route is unreachable, the browser) answers from `src/lib/assistant.ts` using the scenario data. The user never sees an error.

## Deploy to Webflow Cloud

1. Install the CLI globally, not as a project dependency: `npm i -g @webflow/webflow-cli`. On Windows a local copy locks its own files and breaks the `npm ci` step of the deploy.
2. Stop `npm run dev` (it locks native modules in `node_modules`).
3. Run `webflow auth login` **outside this folder** (e.g. from your home directory): it writes `WEBFLOW_API_TOKEN` to a `.env` in the current directory, and OpenNext bundles any `.env` into the deployed worker. Make sure there is no `.env` here before deploying; the CLI reads its credentials from `%APPDATA%\webflow\auth.json`.
4. `webflow apps deploy`.
5. Optional: add `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` as a **secret** environment variable in the Webflow Cloud environment. `/api/assistant` is public and unauthenticated, so use a dedicated key with a spend limit (or a free-tier key, which simply falls back to demo mode when its quota runs out).

