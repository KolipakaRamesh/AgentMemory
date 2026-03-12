import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const log = mutation({
  args: {
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    actionType: v.string(),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    latencyMs: v.optional(v.number()),
    cost: v.optional(v.number()),
    status: v.union(v.literal("success"), v.literal("error")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("agentActions", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
