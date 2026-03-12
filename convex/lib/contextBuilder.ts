import { Id } from "../_generated/dataModel";
import { ChatMessage } from "./openrouter";

interface MemorySummary {
  summary: string;
  type: string;
  importance: number;
}

interface BuildContextOptions {
  systemPrompt?: string;
  memories: MemorySummary[];
  sessionMessages: Array<{ role: string; content: string }>;
  userMessage: string;
  userId: Id<"users">;
}

const DEFAULT_SYSTEM = `You are a helpful AI assistant with persistent memory. 
You remember facts, preferences, and past conversations about the user.
When relevant memories are provided, use them naturally in your responses.
Be concise, helpful, and personable.`;

export function buildContextMessages(
  opts: BuildContextOptions
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  // 1. System prompt
  let system = opts.systemPrompt ?? DEFAULT_SYSTEM;

  // 2. Inject retrieved memories into system prompt
  if (opts.memories.length > 0) {
    const memoryBlock = opts.memories
      .map((m) => `- [${m.type}] ${m.summary}`)
      .join("\n");
    system += `\n\n## What you remember about this user:\n${memoryBlock}`;
  }

  messages.push({ role: "system", content: system });

  // 3. Recent session history (last 10 turns max)
  const history = opts.sessionMessages.slice(-10);
  for (const msg of history) {
    if (msg.role === "user" || msg.role === "assistant") {
      messages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }
  }

  // 4. Current user message
  messages.push({ role: "user", content: opts.userMessage });

  return messages;
}
