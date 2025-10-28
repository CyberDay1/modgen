import React, { useEffect, useState } from "react";

type Settings = {
  apiKey: string;
  rateLimit: number;
  useLocalAI: boolean;
  theme: "dark" | "light";
};

const STORAGE_KEY = "modgen.settings";

function loadSettings(): Settings {
  if (typeof localStorage === "undefined") {
    return {
      apiKey: "",
      rateLimit: 1000,
      useLocalAI: false,
      theme: "dark",
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        apiKey: "",
        rateLimit: 1000,
        useLocalAI: false,
        theme: "dark",
      };
    }

    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      apiKey: parsed.apiKey ?? "",
      rateLimit: typeof parsed.rateLimit === "number" ? parsed.rateLimit : 1000,
      useLocalAI: Boolean(parsed.useLocalAI),
      theme: parsed.theme === "light" ? "light" : "dark",
    };
  } catch (error) {
    console.warn("Failed to load settings", error);
    return {
      apiKey: "",
      rateLimit: 1000,
      useLocalAI: false,
      theme: "dark",
    };
  }
}

function persistSettings(settings: Settings) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export default function SettingsPanel() {
  const [apiKey, setApiKey] = useState("");
  const [rateLimit, setRateLimit] = useState(1000);
  const [useLocalAI, setUseLocalAI] = useState(false);
  const [theme, setTheme] = useState<Settings["theme"]>("dark");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const settings = loadSettings();
    setApiKey(settings.apiKey);
    setRateLimit(settings.rateLimit);
    setUseLocalAI(settings.useLocalAI);
    setTheme(settings.theme);
  }, []);

  const saveSettings = () => {
    const nextSettings: Settings = {
      apiKey,
      rateLimit,
      useLocalAI,
      theme,
    };

    persistSettings(nextSettings);
    setStatusMessage("Settings saved.");
    setTimeout(() => setStatusMessage(null), 2000);
  };

  return (
    <section
      style={{
        background: "#252526",
        borderRadius: "8px",
        padding: "1rem",
        color: "#ddd",
        marginTop: "1rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <h2 style={{ margin: 0 }}>AI Settings</h2>

      <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <span>API Key</span>
        <input
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem",
            background: "#1e1e1e",
            color: "#ddd",
            border: "1px solid #333",
            borderRadius: "4px",
          }}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <span>Rate Limit (tokens/min)</span>
        <input
          type="number"
          value={rateLimit}
          min={0}
          onChange={(event) => setRateLimit(Number(event.target.value) || 0)}
          style={{
            width: "100%",
            padding: "0.5rem",
            background: "#1e1e1e",
            color: "#ddd",
            border: "1px solid #333",
            borderRadius: "4px",
          }}
        />
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input
          type="checkbox"
          checked={useLocalAI}
          onChange={(event) => setUseLocalAI(event.target.checked)}
        />
        <span>Use local AI server</span>
      </label>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <span>Theme</span>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={theme === "dark"}
              onChange={() => setTheme("dark")}
            />
            Dark
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <input
              type="radio"
              name="theme"
              value="light"
              checked={theme === "light"}
              onChange={() => setTheme("light")}
            />
            Light
          </label>
        </div>
      </div>

      <button
        onClick={saveSettings}
        style={{
          alignSelf: "flex-start",
          background: "#007acc",
          color: "#fff",
          border: "none",
          padding: "0.6rem 1.2rem",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Save
      </button>

      {statusMessage && (
        <span style={{ color: "#4caf50" }}>{statusMessage}</span>
      )}
    </section>
  );
}
