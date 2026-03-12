import OpenAI from "openai";

export const CHAT_MODEL = "openai/gpt-4o";
export const FAST_MODEL = "openai/gpt-4o-mini";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function getClient() {
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://agentmemory.app",
      "X-Title": "AgentMemory",
    },
  });
}

export async function chatCompletion(
  messages: ChatMessage[],
  model: string = CHAT_MODEL,
  maxTokens: number = 1024
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
  });
  return {
    content: response.choices[0].message.content ?? "",
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  };
}

export async function extractJson<T>(
  systemPrompt: string,
  userContent: string,
  model: string = FAST_MODEL
): Promise<T | null> {
  try {
    const { content } = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      model,
      512
    );
    const clean = content.replace(/```(?:json)?\n?/g, "").trim();
    return JSON.parse(clean) as T;
  } catch {
    return null;
  }
}
