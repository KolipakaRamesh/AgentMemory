import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {
    userId: v.id("users"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { userId, conversationId }) => {
    return ctx.db
      .query("sessions")
      .withIndex("by_userId_conversationId", (q) =>
        q.eq("userId", userId).eq("conversationId", conversationId)
      )
      .first();
  },
});

export const touch = mutation({
  args: {
    userId: v.id("users"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { userId, conversationId }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_userId_conversationId", (q) =>
        q.eq("userId", userId).eq("conversationId", conversationId)
      )
      .first();
    if (session) {
      await ctx.db.patch(session._id, {
        lastActivityAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
    }
  },
});

export const expireOld = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("sessions")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", Date.now()))
      .take(100);
    for (const s of expired) {
      await ctx.db.patch(s._id, { contextWindow: [] });
    }
  },
});
