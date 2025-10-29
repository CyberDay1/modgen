import React, { useEffect, useMemo, useState } from "react";

type Settings = {
  apiKey: string;
  rateLimit: number;
  useLocalAI: boolean;
  theme: "dark" | "light";
};

const STORAGE_KEY = "modgen.settings";

const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  rateLimit: 1000,
  useLocalAI: false,
  theme: "dark",
};

function loadSettings(): Settings {
  if (typeof localStorage === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      apiKey: parsed.apiKey ?? DEFAULT_SETTINGS.apiKey,
      rateLimit:
        typeof parsed.rateLimit === "number" && Number.isFinite(parsed.rateLimit)
          ? parsed.rateLimit
          : DEFAULT_SETTINGS.rateLimit,
      useLocalAI: Boolean(parsed.useLocalAI),
      theme: parsed.theme === "light" ? "light" : "dark",
    };
  } catch (error) {
    console.warn("Failed to load settings", error);
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(settings: Settings) {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("Failed to persist settings", error);
  }
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const handleChange = <Key extends keyof Settings>(key: Key, value: Settings[Key]) => {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const hasUnsavedChanges = useMemo(() => {
    const stored = loadSettings();
    return (
      stored.apiKey !== settings.apiKey ||
      stored.rateLimit !== settings.rateLimit ||
      stored.useLocalAI !== settings.useLocalAI ||
      stored.theme !== settings.theme
    );
  }, [settings]);

  const saveSettings = () => {
    persistSettings(settings);
    setStatusMessage("Settings saved");
    setTimeout(() => setStatusMessage(null), 2000);
  };

  return (
    <section
      style={{
        background: "#252526",
        borderRadius: "8px",
        padding: "1rem 1.25rem",
        color: "#ddd",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.35)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <header>
        <h2 style={{ margin: "0 0 0.25rem" }}>Settings</h2>
        <p style={{ margin: 0, color: "#aaaaaa", fontSize: "0.9rem" }}>
          Configure API access and runtime preferences for ModGen.
        </p>
      </header>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.65rem",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span style={{ fontSize: "0.95rem" }}>API Key</span>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(event) => handleChange("apiKey", event.target.value)}
            placeholder="Enter your provider key"
            style={{
              width: "100%",
              padding: "0.55rem",
              background: "#1e1e1e",
              color: "#ddd",
              border: "1px solid #333",
              borderRadius: "4px",
            }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span style={{ fontSize: "0.95rem" }}>Rate Limit (tokens/min)</span>
          <input
            type="number"
            value={settings.rateLimit}
            min={0}
            onChange={(event) => handleChange("rateLimit", Number(event.target.value) || 0)}
            style={{
              width: "100%",
              padding: "0.55rem",
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
            checked={settings.useLocalAI}
            onChange={(event) => handleChange("useLocalAI", event.target.checked)}
          />
          <span>Use local AI server</span>
        </label>
      </div>

      <div>
        <span style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.95rem" }}>Theme</span>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={settings.theme === "dark"}
              onChange={() => handleChange("theme", "dark")}
            />
            Dark
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <input
              type="radio"
              name="theme"
              value="light"
              checked={settings.theme === "light"}
              onChange={() => handleChange("theme", "light")}
            />
            Light
          </label>
        </div>
      </div>

      <footer
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <button
          onClick={saveSettings}
          disabled={!hasUnsavedChanges}
          style={{
            background: hasUnsavedChanges ? "#007acc" : "#444",
            color: hasUnsavedChanges ? "#fff" : "#999",
            border: "none",
            padding: "0.6rem 1.3rem",
            borderRadius: "4px",
            cursor: hasUnsavedChanges ? "pointer" : "not-allowed",
            transition: "background 0.2s ease",
          }}
        >
          Save
        </button>
        {statusMessage && <span style={{ color: "#4caf50" }}>{statusMessage}</span>}
      </footer>
    </section>
  );
}
