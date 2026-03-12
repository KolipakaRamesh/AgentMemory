import { action } from "./_generated/server";
import { v } from "convex/values";
import { embedText } from "./lib/embeddings";
import { api } from "./_generated/api";

const semanticSearchOptions = {
  args: {
    userId: v.id("users"),
    query: v.string(),
    limit: v.optional(v.number()),
    type: v.optional(
      v.union(
        v.literal("fact"),
        v.literal("preference"),
        v.literal("episode"),
        v.literal("skill")
      )
    ),
  },
  handler: async (ctx: any, { userId, query, limit = 5, type }: any) => {
    const embedding = await embedText(query);

    const results = await ctx.vectorSearch("memoryEntries", "by_embedding", {
      vector: embedding,
      limit: limit * 2, // fetch more, re-rank below
      filter: type
        ? (q: any) => q.and(q.eq("userId", userId), q.eq("type", type))
        : (q: any) => q.eq("userId", userId),
    });

    // Fetch full memory entries and apply hybrid scoring
    const now = Date.now();
    const scored = await Promise.all(
      results.map(async (hit: any) => {
        const mem = await ctx.runQuery(api.memory.getById, { memoryId: hit._id });
        if (!mem) return null;

        const ageSecs = (now - mem.lastAccessedAt) / 1000;
        const recencyDecay = Math.exp(-ageSecs / (7 * 24 * 3600)); // 7-day half-life
        const hybridScore =
          0.6 * hit._score + 0.2 * recencyDecay + 0.2 * mem.importance;

        return { ...mem, _score: hybridScore };
      })
    );

    const filtered = scored
      .filter(Boolean)
      .sort((a: any, b: any) => b._score - a._score)
      .slice(0, limit);

    // Record access for retrieved memories
    for (const mem of filtered) {
      await ctx.runMutation(api.memory.recordAccess, { memoryId: mem!._id });
    }

    return filtered;
  },
};

export const semanticSearch = action(semanticSearchOptions);
