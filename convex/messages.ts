import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { conversationId, limit = 50 }) => {
    return ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", conversationId)
      )
      .order("asc")
      .take(limit);
  },
});

export const save = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
    ),
    content: v.string(),
    tokenCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const msgId = await ctx.db.insert("messages", {
      ...args,
      createdAt: Date.now(),
    });

    // update conversation metadata
    const conv = await ctx.db.get(args.conversationId);
    if (conv) {
      await ctx.db.patch(args.conversationId, {
        messageCount: conv.messageCount + 1,
        lastMessageAt: Date.now(),
      });
    }

    // update session context window (keep last 10 msgs)
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_userId_conversationId", (q) =>
        q.eq("userId", args.userId).eq("conversationId", args.conversationId)
      )
      .first();

    if (session) {
      const newWindow = [
        ...session.contextWindow,
        { role: args.role, content: args.content },
      ].slice(-10);
      await ctx.db.patch(session._id, {
        contextWindow: newWindow,
        lastActivityAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
    }

    return msgId;
  },
});
