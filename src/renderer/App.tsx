import React, { useEffect, useMemo, useState } from "react";
import SettingsPanel from "./components/SettingsPanel";

type ElectronAPI = NonNullable<Window["electronAPI"]>;

type ModgenAPI = NonNullable<Window["modgen"]>;

export default function App() {
  const [showSettings, setShowSettings] = useState(true);
  const electronAPI = useMemo<ElectronAPI | undefined>(() => window.electronAPI, []);
  const modgenAPI = useMemo<ModgenAPI | undefined>(() => window.modgen, []);

  useEffect(() => {
    // Example of wiring the renderer to the preload bridge. We ensure the APIs are touched so
    // Electron keeps the preload contract exercised.
    const requestResult = electronAPI?.requestGradleLogStream?.();
    if (requestResult !== undefined) {
      Promise.resolve(requestResult).catch(() => {
        /* ignore preload bridge errors in the simplified renderer bootstrap */
      });
    }

    const unsubscribe = modgenAPI?.build?.onLog?.(() => {
      // No-op listener; ensures the bridge is connected.
    });

    return () => {
      unsubscribe?.();
    };
  }, [electronAPI, modgenAPI]);

  return (
    <div
      style={{
        padding: "1rem",
        minHeight: "100vh",
        background: "#1e1e1e",
        color: "#ddd",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div>
          <h1 style={{ color: "#00aaff", marginBottom: "0.25rem" }}>ModGen</h1>
          <p style={{ color: "#ccc", margin: 0 }}>AI-powered mod generator</p>
        </div>
        <button
          onClick={() => setShowSettings((value) => !value)}
          style={{
            marginLeft: "auto",
            background: "#007acc",
            color: "#fff",
            border: "none",
            padding: "0.4rem 0.8rem",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {showSettings ? "Hide" : "Show"} Settings
        </button>
      </header>

      {showSettings && <SettingsPanel />}
    </div>
  );
}
