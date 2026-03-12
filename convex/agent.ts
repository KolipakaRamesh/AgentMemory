import { action } from "./_generated/server";
import { v } from "convex/values";
import { chatCompletion } from "./lib/openrouter";
import { buildContextMessages } from "./lib/contextBuilder";
import { api, internal } from "./_generated/api";

export const chat = action({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    message: v.string(),
  },
  handler: async (ctx, { conversationId, userId, message }) => {
    const start = Date.now();

    // 1. Load user + plan for rate limiting
    const user = await ctx.runQuery(api.users.get, { userId });
    if (!user) throw new Error("User not found");

    // 2. Rate limit check
    await ctx.runMutation(api.rateLimits.check, {
      userId,
      plan: user.plan,
    });

    // 3. Load session context (short-term memory)
    const session = await ctx.runQuery(api.sessions.get, {
      userId,
      conversationId,
    });

    // 4. Vector search for relevant long-term memories
    let memories: any[] = [];
    try {
      memories = await ctx.runAction(api.memorySearch.semanticSearch, {
        userId,
        query: message,
        limit: 5,
      });
    } catch {
      // non-fatal — proceed without memories
    }

    // 5. Build context prompt
    const contextMessages = buildContextMessages({
      memories: memories.map((m: any) => ({
        summary: m.summary,
        type: m.type,
        importance: m.importance,
      })),
      sessionMessages: session?.contextWindow ?? [],
      userMessage: message,
    });

    // 6. Save user message to DB
    await ctx.runMutation(api.messages.save, {
      conversationId,
      userId,
      role: "user",
      content: message,
    });

    // 7. LLM call
    let response = "";
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const result = await chatCompletion(contextMessages);
      response = result.content;
      inputTokens = result.inputTokens;
      outputTokens = result.outputTokens;
    } catch (err: any) {
      await ctx.runMutation(api.agentActions.log, {
        userId,
        conversationId,
        actionType: "llm_request",
        status: "error",
        error: String(err),
        latencyMs: Date.now() - start,
      });
      throw err;
    }

    // 8. Save assistant message
    await ctx.runMutation(api.messages.save, {
      conversationId,
      userId,
      role: "assistant",
      content: response,
      tokenCount: outputTokens,
    });

    // 9. Audit log
    await ctx.runMutation(api.agentActions.log, {
      userId,
      conversationId,
      actionType: "llm_request",
      input: { promptTokens: inputTokens },
      output: { completionTokens: outputTokens },
      latencyMs: Date.now() - start,
      status: "success",
    });

    // 10. Async entity extraction (non-blocking)
    await ctx.scheduler.runAfter(0, internal.memoryExtract.extractAndStore, {
      userId,
      conversationId,
      userMessage: message,
      assistantResponse: response,
    });

    // 11. Touch session TTL
    await ctx.runMutation(api.sessions.touch, { userId, conversationId });

    return response;
  },
});
