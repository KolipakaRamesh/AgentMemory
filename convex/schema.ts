import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── Users ────────────────────────────────────────────────
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    plan: v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("enterprise")
    ),
    memoryQuota: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  // ── Conversations (Episodic) ──────────────────────────────
  conversations: defineTable({
    userId: v.id("users"),
    title: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived")),
    messageCount: v.number(),
    lastMessageAt: v.number(),
    createdAt: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_lastMessage", ["userId", "lastMessageAt"]),

  // ── Messages (Episodic) ───────────────────────────────────
  messages: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
    ),
    content: v.string(),
    tokenCount: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_userId_createdAt", ["userId", "createdAt"]),

  // ── Memory Entries (Long-term + Semantic) ─────────────────
  memoryEntries: defineTable({
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
    accessCount: v.number(),
    lastAccessedAt: v.number(),
    sourceConversationId: v.optional(v.id("conversations")),
    embedding: v.optional(v.array(v.float64())),
    tags: v.optional(v.array(v.string())),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_type", ["userId", "type"])
    .index("by_userId_importance", ["userId", "importance"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId", "type"],
    }),

  // ── Agent Actions (Audit Log) ─────────────────────────────
  agentActions: defineTable({
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    actionType: v.string(),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    latencyMs: v.optional(v.number()),
    cost: v.optional(v.number()),
    status: v.union(v.literal("success"), v.literal("error")),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_conversationId", ["conversationId"])
    .index("by_userId_createdAt", ["userId", "createdAt"]),

  // ── Sessions (Short-term) ─────────────────────────────────
  sessions: defineTable({
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    contextWindow: v.array(v.any()),
    tokenCount: v.number(),
    lastActivityAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_userId_conversationId", ["userId", "conversationId"])
    .index("by_expiresAt", ["expiresAt"]),

  // ── Rate Limits ───────────────────────────────────────────
  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    windowStart: v.number(),
  }).index("by_key", ["key"]),
});
