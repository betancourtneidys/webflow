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

## How it works

- **Scenarios** live in `src/lib/incidents/*.ts`, typed by `src/lib/types.ts`. Each one declares its resources (with diagram positions, metrics, logs and the evidence they reveal), edges, timeline, root cause, resolution options and fallback assistant answers. To add an incident, create a file and append it to `src/lib/incidents/index.ts`.
- **Scoring is deterministic.** Evidence, the hypothesis threshold (`minEvidence`) and the correct option all come from the scenario. The LLM never decides whether you solved it.
- **Assistant.** `POST /api/assistant` calls Claude with the incident context. Until you have `minEvidence`, the prompt contains neither the root cause nor the details of resources you haven't inspected, so it can't give the answer away.
- **Demo mode.** If `ANTHROPIC_API_KEY` is missing, the provider fails, times out or refuses, the route (and, if the route is unreachable, the browser) answers from `src/lib/assistant.ts` using the scenario data. The user never sees an error.

## Deploy to Webflow Cloud

1. Install the CLI globally, not as a project dependency: `npm i -g @webflow/webflow-cli`. On Windows a local copy locks its own files and breaks the `npm ci` step of the deploy.
2. Stop `npm run dev` (it locks native modules in `node_modules`).
3. Run `webflow auth login` **outside this folder** (e.g. from your home directory): it writes `WEBFLOW_API_TOKEN` to a `.env` in the current directory, and OpenNext bundles any `.env` into the deployed worker. Make sure there is no `.env` here before deploying; the CLI reads its credentials from `%APPDATA%\webflow\auth.json`.
4. `webflow apps deploy`.
5. Optional: add `ANTHROPIC_API_KEY` as a **secret** environment variable in the Webflow Cloud environment. `/api/assistant` is public and unauthenticated, so use a dedicated key with a spend limit.

