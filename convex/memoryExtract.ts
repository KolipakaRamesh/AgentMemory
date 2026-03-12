import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { embedText } from "./lib/embeddings";
import { extractJson } from "./lib/openrouter";
import { api } from "./_generated/api";

interface ExtractedMemory {
  type: "fact" | "preference" | "episode" | "skill";
  content: string;
  summary: string;
  importance: number;
  tags: string[];
}

const EXTRACTION_SYSTEM = `You are a memory extraction AI. Given a user message and an AI response, extract important facts, preferences, skills, or episodes about the USER only.

Return a JSON array of memory objects. Each object must have:
- type: "fact" | "preference" | "episode" | "skill"
- content: the full information (1-3 sentences)
- summary: a short phrase (< 15 words) suitable for a prompt
- importance: 0.0–1.0 (1.0 = extremely important personal info)
- tags: array of keyword strings

Rules:
- Only extract information about the USER, not general knowledge
- Skip trivial/conversational messages
- Return [] if nothing meaningful to extract
- Return ONLY valid JSON, no markdown`;

export const extractAndStore = internalAction({
  args: {
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    userMessage: v.string(),
    assistantResponse: v.string(),
  },
  handler: async (ctx, { userId, conversationId, userMessage, assistantResponse }) => {
    const userContent = `USER: ${userMessage}\nASSISTANT: ${assistantResponse}`;

    const extracted = await extractJson<ExtractedMemory[]>(
      EXTRACTION_SYSTEM,
      userContent
    );

    if (!extracted || !Array.isArray(extracted) || extracted.length === 0) {
      return;
    }

    for (const mem of extracted) {
      if (!mem.content || mem.importance < 0.2) continue;

      // Embed the summary for vector search
      const embedding = await embedText(mem.summary + " " + mem.content);

      await ctx.runMutation(api.memory.upsert, {
        userId,
        type: mem.type,
        content: mem.content,
        summary: mem.summary,
        importance: mem.importance,
        sourceConversationId: conversationId,
        embedding,
        tags: mem.tags,
      });
    }
  },
});
