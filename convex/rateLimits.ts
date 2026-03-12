import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const PLAN_LIMITS: Record<string, number> = {
  free: 10,
  pro: 60,
  enterprise: 1000,
};

export const check = mutation({
  args: {
    userId: v.id("users"),
    plan: v.string(),
  },
  handler: async (ctx, { userId, plan }) => {
    const now = Date.now();
    const windowStart = Math.floor(now / 60000) * 60000; // 1-min window
    const key = `${userId}:${windowStart}`;

    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    const limit = PLAN_LIMITS[plan] ?? 10;

    if (existing) {
      if (existing.count >= limit) {
        throw new Error(`Rate limit exceeded. Limit: ${limit} req/min`);
      }
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert("rateLimits", {
        key,
        count: 1,
        windowStart,
      });
    }
  },
});

export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 5 * 60 * 1000; // older than 5 min
    const old = await ctx.db
      .query("rateLimits")
      .filter((q) => q.lt(q.field("windowStart"), cutoff))
      .collect();
    for (const r of old) {
      await ctx.db.delete(r._id);
    }
  },
});
