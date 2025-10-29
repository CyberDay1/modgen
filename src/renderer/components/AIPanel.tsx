import React, { useEffect, useMemo, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
};

const initialMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    text: "Hi! I can help you scaffold mods. Ask for ideas or provide goals to begin.",
    timestamp: Date.now(),
  },
];

export default function AIPanel() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = listRef.current;
    if (!node) {
      return;
    }

    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
      timestamp: Date.now(),
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsThinking(true);

    window.setTimeout(() => {
      setIsThinking(false);
      const response: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: generateResponse(trimmed),
        timestamp: Date.now(),
      };
      setMessages((current) => [...current, response]);
    }, 600);
  };

  const generateResponse = useMemo(() => {
    return (prompt: string) => {
      if (prompt.toLowerCase().includes("quest")) {
        return "Let's outline a quest chain with objectives, rewards, and pacing suggestions.";
      }

      if (prompt.toLowerCase().includes("terrain")) {
        return "Consider generating varied biomes with noise-based heightmaps and themed structures.";
      }

      return "I'll draft a mod plan with feature checklists and integration notes.";
    };
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <section
      style={{
        background: "#252526",
        borderRadius: "8px",
        padding: "1rem 1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.35)",
        minHeight: "60vh",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>AI Workspace</h2>
          <p style={{ margin: 0, color: "#aaaaaa", fontSize: "0.9rem" }}>
            Chat with the assistant to craft mod ideas and generation tasks.
          </p>
        </div>
        <span
          style={{
            fontSize: "0.8rem",
            color: isThinking ? "#ffd166" : "#6fcf97",
            fontWeight: 600,
          }}
        >
          {isThinking ? "Generating..." : "Ready"}
        </span>
      </header>

      <div
        ref={listRef}
        style={{
          flex: "1 1 auto",
          overflowY: "auto",
          background: "#1e1e1e",
          borderRadius: "6px",
          border: "1px solid #333",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {messages.map((message) => (
          <article
            key={message.id}
            style={{
              alignSelf: message.role === "user" ? "flex-end" : "flex-start",
              background: message.role === "user" ? "#005a9e" : "#333333",
              color: "#f5f5f5",
              padding: "0.65rem 0.8rem",
              borderRadius: "6px",
              maxWidth: "75%",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)",
            }}
          >
            <span style={{ display: "block", fontSize: "0.75rem", opacity: 0.7, marginBottom: "0.25rem" }}>
              {message.role === "user" ? "You" : "Assistant"}
            </span>
            <span style={{ whiteSpace: "pre-wrap" }}>{message.text}</span>
          </article>
        ))}
        {isThinking && (
          <article
            style={{
              alignSelf: "flex-start",
              background: "#333333",
              color: "#f5f5f5",
              padding: "0.65rem 0.8rem",
              borderRadius: "6px",
              maxWidth: "60%",
              opacity: 0.85,
              display: "flex",
              gap: "0.4rem",
            }}
          >
            <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>Assistant</span>
            <span>...</span>
          </article>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.75rem" }}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Describe the mod you want to create..."
          style={{
            flex: 1,
            padding: "0.65rem 0.75rem",
            borderRadius: "6px",
            border: "1px solid #333",
            background: "#1e1e1e",
            color: "#ddd",
          }}
        />
        <button
          type="submit"
          disabled={isThinking}
          style={{
            background: isThinking ? "#444" : "#007acc",
            color: isThinking ? "#999" : "#fff",
            border: "none",
            padding: "0.6rem 1.25rem",
            borderRadius: "6px",
            cursor: isThinking ? "not-allowed" : "pointer",
            transition: "background 0.2s ease",
          }}
        >
          Send
        </button>
      </form>
    </section>
  );
}
