import { getIncident } from "@/lib/incidents";
import { buildSystemPrompt, fallbackAnswer, type AssistantRequest } from "@/lib/assistant";
import { isLang } from "@/lib/i18n";
import { buildTurns, complete, pickProvider } from "@/lib/llm";

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

  // Anthropic or Gemini, depending on which key is configured; demo mode otherwise.
  const provider = pickProvider();
  if (!provider) return fallback();

  const answer = await complete(provider, buildSystemPrompt(incident, req), buildTurns(req.history ?? [], question));
  if (!answer) return fallback();
  return Response.json({ answer, source: provider });
}
