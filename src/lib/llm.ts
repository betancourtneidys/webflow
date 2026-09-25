import Anthropic from "@anthropic-ai/sdk";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export type Provider = "anthropic" | "gemini";

const TIMEOUT_MS = 15_000;
// Replies are ~90 words; a low cap also bounds the cost of abuse on this public route.
const MAX_OUTPUT_TOKENS = 1500;

/**
 * Which provider to call. AI_PROVIDER forces one; otherwise the first key found
 * wins. null means demo mode (scenario answers only).
 */
export function pickProvider(): Provider | null {
  const forced = process.env.AI_PROVIDER;
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (forced === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

/** Returns the reply text, or null when the caller should fall back to demo answers. */
export async function complete(provider: Provider, system: string, turns: ChatTurn[]): Promise<string | null> {
  return provider === "anthropic" ? completeAnthropic(system, turns) : completeGemini(system, turns);
}

async function completeAnthropic(system: string, turns: ChatTurn[]) {
  const client = new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 0 });
  try {
    const response = await client.beta.messages.create({
      model: process.env.CLOUD_DETECTIVE_MODEL ?? "claude-opus-5",
      max_tokens: MAX_OUTPUT_TOKENS,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: turns.map((t) => ({ role: t.role, content: t.text })),
    });
    if (response.stop_reason === "refusal") return null;
    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();
    return text || null;
  } catch (error) {
    console.error("assistant: anthropic failed", error instanceof Anthropic.APIError ? error.status : error);
    return null;
  }
}

interface GeminiResponse {
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
}

// REST generateContent (v1beta). Field names checked against Google's published discovery schema.
async function completeGemini(system: string, turns: ChatTurn[]) {
  const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: turns.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.text }] })),
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, thinkingConfig: { thinkingLevel: "LOW" } },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      // 429 = free-tier quota exhausted; 400/403 = bad key or model name.
      console.error("assistant: gemini failed", res.status);
      return null;
    }
    const data = (await res.json()) as GeminiResponse;
    if (data.promptFeedback?.blockReason) return null;
    const candidate = data.candidates?.[0];
    if (!candidate || (candidate.finishReason && !["STOP", "MAX_TOKENS"].includes(candidate.finishReason))) return null;
    const text = (candidate.content?.parts ?? [])
      .filter((p) => !p.thought && p.text)
      .map((p) => p.text)
      .join("")
      .trim();
    return text || null;
  } catch (error) {
    console.error("assistant: gemini failed", error instanceof Error ? error.name : error);
    return null;
  }
}

/**
 * Normalizes client-sent history plus the new question into a valid turn list:
 * starts with the user, alternates roles (merging repeats) and ends with the question.
 */
export function buildTurns(history: ChatTurn[], question: string): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const m of [...history, { role: "user" as const, text: question }]) {
    if (turns.length === 0 && m.role !== "user") continue;
    const last = turns.at(-1);
    if (last && last.role === m.role) last.text = `${last.text}\n\n${m.text}`;
    else turns.push({ role: m.role, text: m.text.slice(0, 1000) });
  }
  return turns;
}
