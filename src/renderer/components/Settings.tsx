import React, { useCallback, useEffect, useMemo, useState } from 'react';

type PersistedSettings = {
  apiKey: string;
  endpoint: string;
  tokenLimit: number | null;
};

type FormState = {
  apiKey: string;
  endpoint: string;
  tokenLimit: string;
};

type Status = {
  kind: 'success' | 'error';
  message: string;
};

const STORAGE_KEY = 'modgen.settings';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseTokenLimit(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function loadPersistedSettings(): PersistedSettings | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as Partial<PersistedSettings>;
    return {
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      endpoint: typeof parsed.endpoint === 'string' ? parsed.endpoint : '',
      tokenLimit:
        typeof parsed.tokenLimit === 'number' && Number.isFinite(parsed.tokenLimit)
          ? parsed.tokenLimit
          : null,
    };
  } catch (error) {
    console.error('Failed to parse stored settings', error);
    return null;
  }
}

function mergeIntoRuntimeSettings(settings: PersistedSettings) {
  if (typeof window === 'undefined') {
    return;
  }

  const anyWindow = window as unknown as Record<string, unknown>;

  if (settings.apiKey) {
    anyWindow.__MODGEN_OPENAI_KEY = settings.apiKey;
    anyWindow.OPENAI_API_KEY = settings.apiKey;
  } else {
    delete anyWindow.__MODGEN_OPENAI_KEY;
    delete anyWindow.OPENAI_API_KEY;
  }

  if (settings.endpoint) {
    anyWindow.__MODGEN_OPENAI_ENDPOINT = settings.endpoint;
    anyWindow.OPENAI_ENDPOINT = settings.endpoint;
    anyWindow.OPENAI_BASE_URL = settings.endpoint;
  } else {
    delete anyWindow.__MODGEN_OPENAI_ENDPOINT;
    delete anyWindow.OPENAI_ENDPOINT;
    delete anyWindow.OPENAI_BASE_URL;
  }

  if (settings.tokenLimit && Number.isFinite(settings.tokenLimit)) {
    anyWindow.__MODGEN_TOKEN_LIMIT = settings.tokenLimit;
  } else {
    delete anyWindow.__MODGEN_TOKEN_LIMIT;
  }

  const existingSettings = isPlainObject(anyWindow.__MODGEN_SETTINGS)
    ? (anyWindow.__MODGEN_SETTINGS as Record<string, unknown>)
    : {};

  const nextSettings: Record<string, unknown> = { ...existingSettings };

  if (settings.endpoint) {
    nextSettings.openAIEndpoint = settings.endpoint;
  } else {
    delete nextSettings.openAIEndpoint;
  }

  if (settings.tokenLimit && Number.isFinite(settings.tokenLimit)) {
    nextSettings.tokenLimit = settings.tokenLimit;
  } else {
    delete nextSettings.tokenLimit;
  }

  const aiSettings = isPlainObject(nextSettings.ai)
    ? ({ ...((nextSettings.ai as Record<string, unknown>) ?? {}) } as Record<string, unknown>)
    : {};
  const openAISettings = isPlainObject(aiSettings.openAI)
    ? ({ ...((aiSettings.openAI as Record<string, unknown>) ?? {}) } as Record<string, unknown>)
    : {};

  if (settings.endpoint) {
    openAISettings.endpoint = settings.endpoint;
    openAISettings.baseUrl = settings.endpoint;
  } else {
    delete openAISettings.endpoint;
    delete openAISettings.baseUrl;
  }

  if (settings.tokenLimit && Number.isFinite(settings.tokenLimit)) {
    openAISettings.tokenLimit = settings.tokenLimit;
    openAISettings.maxTokens = settings.tokenLimit;
  } else {
    delete openAISettings.tokenLimit;
    delete openAISettings.maxTokens;
  }

  if (Object.keys(openAISettings).length > 0) {
    aiSettings.openAI = openAISettings;
  } else {
    delete aiSettings.openAI;
  }

  if (Object.keys(aiSettings).length > 0) {
    nextSettings.ai = aiSettings;
  } else {
    delete nextSettings.ai;
  }

  if (Object.keys(nextSettings).length > 0) {
    anyWindow.__MODGEN_SETTINGS = nextSettings;
  } else {
    delete anyWindow.__MODGEN_SETTINGS;
  }
}

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  padding: '40px 16px',
  background: 'linear-gradient(145deg, #0f172a 0%, #1f2937 100%)',
  boxSizing: 'border-box',
  color: '#e5e7eb',
  fontFamily: 'Inter, system-ui, sans-serif',
};

const panelStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 520,
  backgroundColor: 'rgba(15, 23, 42, 0.9)',
  borderRadius: 16,
  padding: 32,
  boxShadow: '0 24px 70px rgba(15, 23, 42, 0.45)',
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
  border: '1px solid rgba(148, 163, 184, 0.1)',
};

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: 0.2,
};

const inputStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid rgba(148, 163, 184, 0.25)',
  backgroundColor: 'rgba(15, 23, 42, 0.7)',
  color: '#f8fafc',
  fontSize: 15,
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
};

const helperStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#94a3b8',
  lineHeight: 1.4,
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
};

const buttonStyle: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: 9999,
  border: 'none',
  background: 'linear-gradient(135deg, #6366f1 0%, #2563eb 100%)',
  color: '#f8fafc',
  fontWeight: 600,
  fontSize: 15,
  cursor: 'pointer',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  boxShadow: '0 12px 30px rgba(79, 70, 229, 0.35)',
};

const disabledButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.6,
  cursor: 'not-allowed',
  boxShadow: 'none',
};

const statusStyleBase: React.CSSProperties = {
  padding: '12px 16px',
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 500,
};

const successStatusStyle: React.CSSProperties = {
  ...statusStyleBase,
  color: '#bbf7d0',
  backgroundColor: 'rgba(34, 197, 94, 0.18)',
  border: '1px solid rgba(34, 197, 94, 0.45)',
};

const errorStatusStyle: React.CSSProperties = {
  ...statusStyleBase,
  color: '#fecaca',
  backgroundColor: 'rgba(248, 113, 113, 0.18)',
  border: '1px solid rgba(248, 113, 113, 0.45)',
};

const titleStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const headingStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 15,
  color: '#cbd5f5',
};

const Settings: React.FC = () => {
  const [form, setForm] = useState<FormState>({ apiKey: '', endpoint: '', tokenLimit: '' });
  const [persisted, setPersisted] = useState<PersistedSettings>({
    apiKey: '',
    endpoint: '',
    tokenLimit: null,
  });
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const stored = loadPersistedSettings();
    if (stored) {
      setPersisted(stored);
      setForm({
        apiKey: stored.apiKey,
        endpoint: stored.endpoint,
        tokenLimit: stored.tokenLimit !== null ? String(stored.tokenLimit) : '',
      });
      mergeIntoRuntimeSettings(stored);
      return;
    }

    mergeIntoRuntimeSettings(persisted);
  }, []);

  const isDirty = useMemo(() => {
    const trimmedApiKey = form.apiKey.trim();
    const trimmedEndpoint = form.endpoint.trim();
    const parsedTokenLimit = parseTokenLimit(form.tokenLimit);
    return (
      trimmedApiKey !== persisted.apiKey ||
      trimmedEndpoint !== persisted.endpoint ||
      (parsedTokenLimit ?? null) !== (persisted.tokenLimit ?? null)
    );
  }, [form, persisted]);

  const handleChange = useCallback(<K extends keyof FormState>(key: K, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  }, []);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      setStatus(null);

      const apiKey = form.apiKey.trim();
      const endpoint = form.endpoint.trim();
      const tokenLimit = parseTokenLimit(form.tokenLimit);

      if (form.tokenLimit.trim() && tokenLimit === null) {
        setStatus({ kind: 'error', message: 'Token limit must be a positive integer.' });
        return;
      }

      const payload: PersistedSettings = {
        apiKey,
        endpoint,
        tokenLimit,
      };

      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        }
        mergeIntoRuntimeSettings(payload);
        setPersisted(payload);
        setStatus({ kind: 'success', message: 'Settings saved successfully.' });
      } catch (error) {
        console.error('Failed to save settings', error);
        setStatus({ kind: 'error', message: 'Unable to save settings. Check storage permissions.' });
      }
    },
    [form],
  );

  return (
    <div style={containerStyle}>
      <form style={panelStyle} onSubmit={handleSubmit}>
        <div style={titleStyle}>
          <h1 style={headingStyle}>Runtime Settings</h1>
          <p style={subtitleStyle}>
            Configure your OpenAI access. Values are stored locally and applied instantly to the running
            session.
          </p>
        </div>

        {status && (
          <div style={status.kind === 'success' ? successStatusStyle : errorStatusStyle}>{status.message}</div>
        )}

        <div style={fieldGroupStyle}>
          <label style={labelStyle} htmlFor="apiKey">
            OpenAI API Key
          </label>
          <input
            id="apiKey"
            type="password"
            style={inputStyle}
            placeholder="sk-..."
            value={form.apiKey}
            onChange={(event) => handleChange('apiKey', event.target.value)}
            autoComplete="off"
          />
          <span style={helperStyle}>
            Stored securely on this device only. Leave blank to rely on environment variables.
          </span>
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle} htmlFor="endpoint">
            Local / Custom Endpoint
          </label>
          <input
            id="endpoint"
            type="url"
            style={inputStyle}
            placeholder="https://api.openai.com/v1"
            value={form.endpoint}
            onChange={(event) => handleChange('endpoint', event.target.value)}
            autoComplete="off"
          />
          <span style={helperStyle}>
            Point to a compatible OpenAI API implementation. Leave blank to use the default hosted
            endpoint.
          </span>
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle} htmlFor="tokenLimit">
            Token Limit Override
          </label>
          <input
            id="tokenLimit"
            type="number"
            min={1}
            step={1}
            style={inputStyle}
            placeholder="e.g. 4096"
            value={form.tokenLimit}
            onChange={(event) => handleChange('tokenLimit', event.target.value)}
          />
          <span style={helperStyle}>
            Optional safety limit for generated requests. Enter a positive integer or leave empty to use the
            model default.
          </span>
        </div>

        <div style={buttonRowStyle}>
          <button type="submit" style={isDirty ? buttonStyle : disabledButtonStyle} disabled={!isDirty}>
            Save settings
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
