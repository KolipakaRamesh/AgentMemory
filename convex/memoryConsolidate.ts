import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const consolidate = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Delete stale, low-importance memories not accessed in 30 days
    const stale = await ctx.runQuery(api.memory.getStale, { userId });
    for (const mem of stale) {
      if (mem.importance < 0.2 && mem.accessCount === 0) {
        await ctx.runMutation(api.memory.remove, { memoryId: mem._id });
      }
    }
  },
});
