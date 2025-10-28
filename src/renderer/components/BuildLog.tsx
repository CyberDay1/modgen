import React from 'react';

const MAX_BUFFERED_LINES = 4000;
const AUTO_SCROLL_THRESHOLD_PX = 48;

type LogLevel = 'info' | 'warn' | 'error';

type BuildLogEntry = {
  id: number;
  text: string;
  level: LogLevel;
  timestamp: number;
};

type LogSubscription = {
  unsubscribe: () => void;
  requestStart?: () => void;
  requestStop?: () => void;
};

type UnknownDispose = (() => void) | { dispose?: () => void; off?: () => void; unsubscribe?: () => void } | void;

type LogPayload =
  | string
  | {
      message?: string;
      text?: string;
      chunk?: string;
      level?: string;
      severity?: string;
      source?: string;
      stream?: string;
      type?: string;
      timestamp?: number | string;
    };

declare global {
  interface Window {
    electronAPI?: {
      onGradleLog?: (listener: (payload: unknown) => UnknownDispose) => UnknownDispose;
      requestGradleLogStream?: () => void;
      startGradleLogStream?: () => void;
      stopGradleLogStream?: () => void;
    };
    modgen?: {
      onGradleLog?: (listener: (payload: unknown) => UnknownDispose) => UnknownDispose;
      build?: {
        onLog?: (listener: (payload: unknown) => UnknownDispose) => UnknownDispose;
        startStreaming?: () => void;
        stopStreaming?: () => void;
      };
    };
    require?: (module: string) => any;
    nodeRequire?: (module: string) => any;
  }
}

function resolveDispose(dispose: UnknownDispose): () => void {
  if (typeof dispose === 'function') {
    return dispose;
  }

  if (dispose && typeof dispose === 'object') {
    return () => {
      dispose.dispose?.();
      dispose.off?.();
      dispose.unsubscribe?.();
    };
  }

  return () => undefined;
}

function subscribeToGradleLogs(listener: (payload: unknown) => void): LogSubscription | undefined {
  const anyWindow = window as typeof window & { [key: string]: any };

  const electronApi = anyWindow.electronAPI;
  if (electronApi?.onGradleLog) {
    const unsubscribe = resolveDispose(electronApi.onGradleLog(listener));
    const requestStart =
      typeof electronApi.startGradleLogStream === 'function'
        ? electronApi.startGradleLogStream
        : electronApi.requestGradleLogStream;
    const requestStop =
      typeof electronApi.stopGradleLogStream === 'function'
        ? electronApi.stopGradleLogStream
        : undefined;

    return {
      unsubscribe,
      requestStart,
      requestStop,
    };
  }

  const modgenBridge = anyWindow.modgen;
  if (modgenBridge?.onGradleLog) {
    const unsubscribe = resolveDispose(modgenBridge.onGradleLog(listener));
    return {
      unsubscribe,
      requestStart: modgenBridge.build?.startStreaming,
      requestStop: modgenBridge.build?.stopStreaming,
    };
  }

  if (modgenBridge?.build?.onLog) {
    const unsubscribe = resolveDispose(modgenBridge.build.onLog(listener));
    return {
      unsubscribe,
      requestStart: modgenBridge.build.startStreaming,
      requestStop: modgenBridge.build.stopStreaming,
    };
  }

  const dynamicRequire = anyWindow.require ?? anyWindow.nodeRequire;
  const electron = dynamicRequire?.('electron');
  const ipcRenderer = electron?.ipcRenderer;

  if (ipcRenderer?.on) {
    const channel = 'gradle:log';
    const ipcListener = (_event: unknown, payload: unknown) => listener(payload);
    ipcRenderer.on(channel, ipcListener);
    ipcRenderer.send?.('gradle:log:subscribe');

    return {
      unsubscribe: () => {
        ipcRenderer.removeListener?.(channel, ipcListener);
        ipcRenderer.send?.('gradle:log:unsubscribe');
      },
    };
  }

  return undefined;
}

function inferLevel(rawLevel?: string): LogLevel {
  if (!rawLevel) {
    return 'info';
  }

  const lower = rawLevel.toLowerCase();
  if (lower.includes('error') || lower.includes('fail') || lower.includes('stderr')) {
    return 'error';
  }

  if (lower.includes('warn')) {
    return 'warn';
  }

  return 'info';
}

function normalisePayload(payload: LogPayload, idRef: React.MutableRefObject<number>): BuildLogEntry | null {
  let text: string | undefined;
  let level: LogLevel = 'info';
  let timestamp = Date.now();

  if (typeof payload === 'string') {
    text = payload;
  } else if (payload && typeof payload === 'object') {
    text = payload.message ?? payload.text ?? payload.chunk;
    level = inferLevel(payload.level ?? payload.severity ?? payload.type ?? payload.source ?? payload.stream);
    if (payload.timestamp) {
      const numericTimestamp =
        typeof payload.timestamp === 'number' ? payload.timestamp : Number(new Date(payload.timestamp).valueOf());
      if (!Number.isNaN(numericTimestamp)) {
        timestamp = numericTimestamp;
      }
    }
  }

  if (typeof text !== 'string' || text.length === 0) {
    return null;
  }

  return {
    id: idRef.current++,
    text,
    level,
    timestamp,
  };
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const severityColours: Record<LogLevel, string> = {
  info: '#d1d5db',
  warn: '#facc15',
  error: '#f87171',
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  background: '#111827',
  color: '#e5e7eb',
  borderRadius: 8,
  overflow: 'hidden',
  border: '1px solid #1f2937',
  height: '100%',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.75rem 1rem',
  background: '#1f2937',
  borderBottom: '1px solid #374151',
};

const scrollRegionStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '1rem',
  fontFamily: 'ui-monospace, SFMono-Regular, SFMono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: '0.85rem',
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  background: '#111827',
};

const controlsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
};

const buttonStyle: React.CSSProperties = {
  border: '1px solid #374151',
  borderRadius: 4,
  padding: '0.25rem 0.75rem',
  background: '#1f2937',
  color: '#f9fafb',
  cursor: 'pointer',
  fontSize: '0.75rem',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const logLineStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'flex-start',
  paddingBottom: '0.2rem',
};

const timestampStyle: React.CSSProperties = {
  color: '#9ca3af',
  flexShrink: 0,
};

const waitingStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontStyle: 'italic',
};

const BuildLog: React.FC = () => {
  const [entries, setEntries] = React.useState<BuildLogEntry[]>([]);
  const [autoScroll, setAutoScroll] = React.useState(true);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const entryIdRef = React.useRef(0);

  const handleIncoming = React.useCallback(
    (payload: unknown) => {
      setEntries((previous) => {
        const entry = normalisePayload(payload as LogPayload, entryIdRef);
        if (!entry) {
          return previous;
        }

        const trimmed = previous.length >= MAX_BUFFERED_LINES ? previous.slice(-MAX_BUFFERED_LINES + 1) : [...previous];
        trimmed.push(entry);
        return trimmed;
      });
    },
    [entryIdRef],
  );

  React.useEffect(() => {
    const subscription = subscribeToGradleLogs(handleIncoming);

    if (!subscription) {
      console.warn('BuildLog: unable to locate a Gradle log stream bridge. No logs will be displayed.');
      return;
    }

    subscription.requestStart?.();

    return () => {
      subscription.requestStop?.();
      subscription.unsubscribe();
    };
  }, [handleIncoming]);

  React.useEffect(() => {
    if (!autoScroll) {
      return;
    }

    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [entries, autoScroll]);

  const onScroll = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setAutoScroll(distanceFromBottom <= AUTO_SCROLL_THRESHOLD_PX);
  }, []);

  const clearLogs = React.useCallback(() => {
    setEntries([]);
  }, []);

  const copyLogs = React.useCallback(async () => {
    if (!navigator?.clipboard) {
      return;
    }

    const text = entries.map((entry) => `[${formatTimestamp(entry.timestamp)}] ${entry.text}`).join('\n');
    await navigator.clipboard.writeText(text);
  }, [entries]);

  const toggleAutoScroll = React.useCallback(() => {
    setAutoScroll((value) => !value);
  }, []);

  return (
    <section style={containerStyle} aria-label="Gradle build log panel">
      <header style={headerStyle}>
        <div style={badgeStyle}>
          <span style={{ fontWeight: 600 }}>Gradle Build Log</span>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{entries.length} lines</span>
        </div>
        <div style={controlsStyle}>
          <button type="button" style={buttonStyle} onClick={copyLogs}>
            Copy
          </button>
          <button type="button" style={buttonStyle} onClick={clearLogs}>
            Clear
          </button>
          <button type="button" style={buttonStyle} onClick={toggleAutoScroll}>
            {autoScroll ? 'Pause autoscroll' : 'Resume autoscroll'}
          </button>
        </div>
      </header>
      <div ref={containerRef} style={scrollRegionStyle} onScroll={onScroll}>
        {entries.length === 0 ? (
          <div style={waitingStyle}>Waiting for Gradle output…</div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} style={logLineStyle}>
              <span style={timestampStyle}>[{formatTimestamp(entry.timestamp)}]</span>
              <span
                style={{
                  flex: 1,
                  color: severityColours[entry.level],
                  whiteSpace: 'pre-wrap',
                }}
              >
                {entry.text}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default BuildLog;
