import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    userId: v.id("users"),
    type: v.optional(
      v.union(
        v.literal("fact"),
        v.literal("preference"),
        v.literal("episode"),
        v.literal("skill")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, type, limit = 50 }) => {
    if (type) {
      return ctx.db
        .query("memoryEntries")
        .withIndex("by_userId_type", (q) =>
          q.eq("userId", userId).eq("type", type)
        )
        .order("desc")
        .take(limit);
    }
    return ctx.db
      .query("memoryEntries")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

export const upsert = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("fact"),
      v.literal("preference"),
      v.literal("episode"),
      v.literal("skill")
    ),
    content: v.string(),
    summary: v.string(),
    importance: v.number(),
    sourceConversationId: v.optional(v.id("conversations")),
    embedding: v.optional(v.array(v.float64())),
    tags: v.optional(v.array(v.string())),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if very similar memory exists (same type + first 80 chars of content)
    const existing = await ctx.db
      .query("memoryEntries")
      .withIndex("by_userId_type", (q) =>
        q.eq("userId", args.userId).eq("type", args.type)
      )
      .filter((q) =>
        q.eq(
          q.field("content"),
          args.content.slice(0, 80)
        )
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        summary: args.summary,
        importance: Math.max(existing.importance, args.importance),
        accessCount: existing.accessCount + 1,
        lastAccessedAt: Date.now(),
        embedding: args.embedding ?? existing.embedding,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return ctx.db.insert("memoryEntries", {
      ...args,
      accessCount: 0,
      lastAccessedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateEmbedding = mutation({
  args: {
    memoryId: v.id("memoryEntries"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, { memoryId, embedding }) => {
    await ctx.db.patch(memoryId, { embedding, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { memoryId: v.id("memoryEntries") },
  handler: async (ctx, { memoryId }) => {
    await ctx.db.delete(memoryId);
  },
});

export const getStale = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return ctx.db
      .query("memoryEntries")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.lt(q.field("importance"), 0.3),
          q.lt(q.field("lastAccessedAt"), thirtyDaysAgo)
        )
      )
      .take(100);
  },
});

export const getById = query({
  args: { memoryId: v.id("memoryEntries") },
  handler: async (ctx, { memoryId }) => {
    return ctx.db.get(memoryId);
  },
});

export const recordAccess = mutation({
  args: { memoryId: v.id("memoryEntries") },
  handler: async (ctx, { memoryId }) => {
    const mem = await ctx.db.get(memoryId);
    if (mem) {
      await ctx.db.patch(memoryId, {
        accessCount: mem.accessCount + 1,
        lastAccessedAt: Date.now(),
      });
    }
  },
});
