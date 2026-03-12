"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

const TYPES = ["all", "fact", "preference", "episode", "skill"] as const;
type FilterType = (typeof TYPES)[number];

function importanceColor(score: number): string {
  if (score >= 0.7) return "#ef4444";
  if (score >= 0.4) return "#f59e0b";
  return "#6366f1";
}

export default function MemoryPage() {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  const getOrCreateUser = useMutation(api.users.getOrCreate);
  const deleteMemory = useMutation(api.memory.remove);

  useEffect(() => {
    getOrCreateUser({
      clerkId: "demo-user",
      email: "demo@agentmemory.app",
      name: "Demo User",
    }).then((id) => setUserId(id));
  }, [getOrCreateUser]);

  const memories = useQuery(
    api.memory.list,
    userId
      ? {
          userId,
          type: filter === "all" ? undefined : filter,
          limit: 100,
        }
      : "skip"
  );

  const handleDelete = async (memoryId: Id<"memoryEntries">) => {
    if (confirm("Delete this memory?")) {
      await deleteMemory({ memoryId });
    }
  };

  return (
    <div className="app-shell">
      {/* Mini sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">🧠</div>
            <span className="sidebar-logo-text">AgentMemory</span>
          </div>
        </div>
        <nav className="sidebar-nav" />
        <div className="sidebar-footer">
          <Link href="/" className="sidebar-link">
            💬 Chat
          </Link>
          <Link href="/memory" className="sidebar-link" style={{ color: "var(--accent)" }}>
            🗂 Memory Explorer
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px",
        }}
      >
        <div className="memory-page" style={{ maxWidth: 860, margin: "0 auto" }}>
          <div className="page-header">
            <h1>Memory Explorer</h1>
            <p>
              All facts, preferences, episodes, and skills your AI has learned
              about you.
            </p>
          </div>

          {/* Filters */}
          <div className="memory-filters">
            {TYPES.map((t) => (
              <button
                key={t}
                className={`filter-chip ${filter === t ? "active" : ""}`}
                onClick={() => setFilter(t)}
              >
                {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                {memories && t !== "all" && (
                  <span style={{ marginLeft: 4, opacity: 0.7 }}>
                    ({memories.filter((m: any) => m.type === t).length})
                  </span>
                )}
                {memories && t === "all" && (
                  <span style={{ marginLeft: 4, opacity: 0.7 }}>
                    ({memories.length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Memory list */}
          <div className="memory-grid">
            {!memories ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                Loading memories…
              </p>
            ) : memories.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 0",
                  color: "var(--text-secondary)",
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔮</div>
                <p>No memories yet. Start a conversation!</p>
              </div>
            ) : (
              memories.map((mem: any) => (
                <div key={mem._id} className="memory-card">
                  <span className={`memory-type-badge type-${mem.type}`}>
                    {mem.type}
                  </span>
                  <div className="memory-content">
                    <div className="memory-summary">{mem.summary}</div>
                    <div className="memory-detail">{mem.content}</div>
                    <div className="importance-bar">
                      <div
                        className="importance-fill"
                        style={{
                          width: `${Math.round(mem.importance * 100)}%`,
                          background: `linear-gradient(90deg, ${importanceColor(mem.importance)}, var(--accent))`,
                        }}
                      />
                    </div>
                    <div className="memory-meta">
                      <span>
                        Importance: {Math.round(mem.importance * 100)}%
                      </span>
                      <span>Accessed: {mem.accessCount}×</span>
                      {mem.tags && mem.tags.length > 0 && (
                        <span>🏷 {mem.tags.join(", ")}</span>
                      )}
                      <span>
                        {new Date(mem.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(mem._id)}
                    title="Delete memory"
                  >
                    🗑
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
