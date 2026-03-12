"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useRef, useEffect, useCallback } from "react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

const SUGGESTIONS = [
  "Tell me about yourself",
  "I prefer dark mode and minimalist UIs",
  "My name is Alex and I'm a software engineer",
  "I'm vegetarian and love hiking",
];

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ThinkingDots() {
  return (
    <div className="msg-row">
      <div className="msg-avatar ai">🤖</div>
      <div className="thinking">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function MessageList({
  conversationId,
  thinking,
}: {
  conversationId: Id<"conversations">;
  thinking: boolean;
}) {
  const messages = useQuery(api.messages.list, { conversationId });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  if (!messages) return null;

  return (
    <>
      {messages.map((msg: any) => (
        <div key={msg._id} className={`msg-row ${msg.role}`}>
          <div className={`msg-avatar ${msg.role === "assistant" ? "ai" : ""}`}>
            {msg.role === "assistant" ? "🤖" : "👤"}
          </div>
          <div>
            <div className={`msg-bubble ${msg.role}`}>{msg.content}</div>
            <div className={`msg-time ${msg.role === "user" ? "text-right" : ""}`}>
              {formatTime(msg.createdAt)}
            </div>
          </div>
        </div>
      ))}
      {thinking && <ThinkingDots />}
      <div ref={bottomRef} />
    </>
  );
}

function Sidebar({
  userId,
  activeConvId,
  onSelect,
}: {
  userId: Id<"users">;
  activeConvId: Id<"conversations"> | null;
  onSelect: (id: Id<"conversations">) => void;
}) {
  const conversations = useQuery(api.conversations.list, { userId });
  const createConv = useMutation(api.conversations.create);

  const handleNew = async () => {
    const id = await createConv({ userId, title: "New Conversation" });
    onSelect(id);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🧠</div>
          <span className="sidebar-logo-text">AgentMemory</span>
        </div>
        <button className="btn-new-chat" onClick={handleNew}>
          <span>+</span> New Chat
        </button>
      </div>
      <nav className="sidebar-nav">
        {!conversations || conversations.length === 0 ? (
          <p className="no-conversations">No conversations yet</p>
        ) : (
          conversations.map((c: any) => (
            <div
              key={c._id}
              className={`conv-item ${c._id === activeConvId ? "active" : ""}`}
              onClick={() => onSelect(c._id)}
            >
              💬 {c.title}
            </div>
          ))
        )}
      </nav>
      <div className="sidebar-footer">
        <Link href="/memory" className="sidebar-link">
          🗂 Memory Explorer
        </Link>
      </div>
    </aside>
  );
}

export default function ChatPage() {
  // Demo: use a fixed userId until Clerk is wired up
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [activeConvId, setActiveConvId] = useState<Id<"conversations"> | null>(
    null
  );
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getOrCreateUser = useMutation(api.users.getOrCreate);
  const sendMessage = useAction(api.agent.chat);

  // Bootstrap demo user on mount
  useEffect(() => {
    getOrCreateUser({
      clerkId: "demo-user",
      email: "demo@agentmemory.app",
      name: "Demo User",
    }).then((id) => setUserId(id));
  }, [getOrCreateUser]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !userId || !activeConvId || thinking) return;
    const msg = input.trim();
    setInput("");
    setThinking(true);

    try {
      await sendMessage({
        conversationId: activeConvId,
        userId,
        message: msg,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setThinking(false);
    }
  }, [input, userId, activeConvId, thinking, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  const handleSuggestion = (s: string) => {
    setInput(s);
    textareaRef.current?.focus();
  };

  return (
    <div className="app-shell">
      {userId && (
        <Sidebar
          userId={userId}
          activeConvId={activeConvId}
          onSelect={setActiveConvId}
        />
      )}

      <main className="chat-area">
        <header className="chat-header">
          <span className="chat-title">
            {activeConvId ? "Conversation" : "AgentMemory"}
          </span>
          <span className="memory-badge">🧠 Persistent Memory Active</span>
        </header>

        <div className="messages-container">
          {!activeConvId ? (
            <div className="empty-state">
              <div className="empty-icon">🧠</div>
              <h2>Your AI with Memory</h2>
              <p>
                Start a conversation. The AI will remember facts, preferences,
                and past interactions across sessions.
              </p>
              <div className="suggestion-chips">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="chip"
                    onClick={() => handleSuggestion(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <MessageList
              conversationId={activeConvId}
              thinking={thinking}
            />
          )}
        </div>

        <div className="input-area">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              className="msg-input"
              placeholder={
                activeConvId
                  ? "Type a message… (Shift+Enter for new line)"
                  : "Select or create a conversation to start"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!activeConvId || thinking}
              rows={1}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!input.trim() || !activeConvId || thinking}
              aria-label="Send"
            >
              ➤
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
