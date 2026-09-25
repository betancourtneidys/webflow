import Anthropic from "@anthropic-ai/sdk";
import { getIncident } from "@/lib/incidents";
import { buildSystemPrompt, fallbackAnswer, type AssistantRequest } from "@/lib/assistant";
import { isLang } from "@/lib/i18n";

const MODEL = process.env.CLOUD_DETECTIVE_MODEL ?? "claude-opus-5";

export async function POST(request: Request) {
  let body: AssistantRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const lang = isLang(body.lang) ? body.lang : "en";
  const incident = getIncident(String(body.incidentId), lang);
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  if (!incident || !question) {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }

  // Only trust ids that exist in the scenario.
  const knownEvidence = new Set(incident.evidence.map((e) => e.id));
  const knownResources = new Set(incident.resources.map((r) => r.id));
  const req: AssistantRequest = {
    incidentId: incident.id,
    question,
    lang,
    evidence: (Array.isArray(body.evidence) ? body.evidence : []).filter((id) => knownEvidence.has(id)),
    inspected: (Array.isArray(body.inspected) ? body.inspected : []).filter((id) => knownResources.has(id)),
    history: (Array.isArray(body.history) ? body.history : [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.text === "string")
      .slice(-6),
  };

  const fallback = () => Response.json({ answer: fallbackAnswer(incident, req), source: "fallback" });

  if (!process.env.ANTHROPIC_API_KEY) return fallback();

  try {
    const client = new Anthropic({ timeout: 15_000, maxRetries: 0 });
    const history: Anthropic.Beta.BetaMessageParam[] = [];
    for (const m of req.history ?? []) {
      // The API requires the conversation to start with a user turn.
      if (history.length === 0 && m.role !== "user") continue;
      history.push({ role: m.role, content: m.text.slice(0, 1000) });
    }
    if (history.at(-1)?.role === "user") history.pop();

    const response = await client.beta.messages.create({
      model: MODEL,
      // Replies are ~90 words; a low cap also bounds the cost of abuse on this public route.
      max_tokens: 1500,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: buildSystemPrompt(incident, req),
      messages: [...history, { role: "user", content: question }],
    });

    if (response.stop_reason === "refusal") return fallback();
    const answer = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();
    if (!answer) return fallback();
    return Response.json({ answer, source: "ai" });
  } catch (error) {
    console.error("assistant: falling back", error instanceof Anthropic.APIError ? error.status : error);
    return fallback();
  }
}
