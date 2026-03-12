import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, { userId, title }) => {
    const convId = await ctx.db.insert("conversations", {
      userId,
      title: title ?? "New Conversation",
      status: "active",
      messageCount: 0,
      lastMessageAt: Date.now(),
      createdAt: Date.now(),
    });

    // create a session for this conversation
    await ctx.db.insert("sessions", {
      userId,
      conversationId: convId,
      contextWindow: [],
      tokenCount: 0,
      lastActivityAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h
    });

    return convId;
  },
});

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("conversations")
      .withIndex("by_userId_lastMessage", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    return ctx.db.get(conversationId);
  },
});

export const archive = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    await ctx.db.patch(conversationId, { status: "archived" });
  },
});

export const updateTitle = mutation({
  args: { conversationId: v.id("conversations"), title: v.string() },
  handler: async (ctx, { conversationId, title }) => {
    await ctx.db.patch(conversationId, { title });
  },
});
