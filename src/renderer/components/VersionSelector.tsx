import React from 'react';

const VERSION_OPTIONS = [
  '1.21.10',
  '1.21.9',
  '1.21.8',
  '1.21.7',
  '1.21.6',
  '1.21.5',
  '1.21.4',
  '1.21.3',
  '1.21.2',
  '1.21.1',
  '1.21',
  '1.20.4',
  '1.20.3',
  '1.20.2',
  '1.20.1',
] as const;

type LoaderOption = 'neoforge' | 'fabric' | 'both';

const LOADER_OPTIONS: ReadonlyArray<{ value: LoaderOption; label: string }> = [
  { value: 'neoforge', label: 'NeoForge' },
  { value: 'fabric', label: 'Fabric' },
  { value: 'both', label: 'Both (NeoForge + Fabric)' },
];

const DEFAULT_LOADER: LoaderOption = 'neoforge';
const STORAGE_KEY = 'modgen:project-config';

type VersionMap = Record<string, LoaderOption>;

interface ProjectConfig {
  versions: VersionMap;
}

type ProjectBridge = {
  project?: {
    getConfig?: () => ProjectConfig | Promise<ProjectConfig | null | undefined> | null | undefined;
    setConfig?: (config: ProjectConfig) => void | Promise<unknown>;
  };
};

type AnyWindow = typeof window & { modgen?: ProjectBridge };

const allowedVersions = new Set<string>(VERSION_OPTIONS);
const allowedLoaders = new Set<LoaderOption>(LOADER_OPTIONS.map((option) => option.value));

function normaliseProjectConfig(raw: unknown): ProjectConfig {
  const empty: ProjectConfig = { versions: {} };

  if (!raw || typeof raw !== 'object') {
    return empty;
  }

  const maybeConfig = raw as Record<string, unknown> & { versions?: unknown; loader?: unknown };
  const versionMap: VersionMap = {};

  if (Array.isArray(maybeConfig.versions)) {
    const fallbackLoader = allowedLoaders.has(maybeConfig.loader as LoaderOption)
      ? (maybeConfig.loader as LoaderOption)
      : DEFAULT_LOADER;

    for (const entry of maybeConfig.versions) {
      if (typeof entry === 'string' && allowedVersions.has(entry)) {
        versionMap[entry] = fallbackLoader;
      }
    }
  } else if (maybeConfig.versions && typeof maybeConfig.versions === 'object') {
    for (const [version, loader] of Object.entries(maybeConfig.versions as Record<string, unknown>)) {
      if (allowedVersions.has(version) && allowedLoaders.has(loader as LoaderOption)) {
        versionMap[version] = loader as LoaderOption;
      }
    }
  }

  return { versions: versionMap };
}

function readConfigFromStorage(): ProjectConfig | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? normaliseProjectConfig(JSON.parse(stored)) : null;
  } catch (error) {
    console.warn('Failed to read project config from storage', error);
    return null;
  }
}

async function readConfigFromBridge(): Promise<ProjectConfig | null> {
  const anyWindow = window as AnyWindow;
  const getConfig = anyWindow.modgen?.project?.getConfig;

  if (typeof getConfig !== 'function') {
    return null;
  }

  try {
    const maybeConfig = await getConfig();
    return maybeConfig ? normaliseProjectConfig(maybeConfig) : null;
  } catch (error) {
    console.warn('Failed to read project config from bridge', error);
    return null;
  }
}

function persistConfig(config: ProjectConfig): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn('Failed to persist project config to storage', error);
  }

  const anyWindow = window as AnyWindow;
  const setConfig = anyWindow.modgen?.project?.setConfig;

  if (typeof setConfig === 'function') {
    try {
      const maybePromise = setConfig(config);
      if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
        (maybePromise as Promise<unknown>).catch((error) => {
          console.warn('Failed to persist project config via bridge', error);
        });
      }
    } catch (error) {
      console.warn('Failed to persist project config via bridge', error);
    }
  }
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  background: '#111827',
  borderRadius: 12,
  border: '1px solid #1f2937',
  padding: 20,
  color: '#e5e7eb',
  fontFamily: 'Inter, system-ui, sans-serif',
  maxWidth: 480,
};

const headerStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  margin: 0,
};

const descriptionStyle: React.CSSProperties = {
  margin: 0,
  color: '#9ca3af',
  lineHeight: 1.5,
};

const versionGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
};

const versionCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  background: '#1f2937',
  borderRadius: 10,
  border: '1px solid #374151',
  padding: 12,
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
};

const versionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontWeight: 500,
};

const selectStyle: React.CSSProperties = {
  borderRadius: 8,
  border: '1px solid #4b5563',
  background: '#111827',
  color: '#f9fafb',
  padding: '6px 8px',
};

const summaryStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  background: '#1f2937',
  borderRadius: 10,
  border: '1px solid #374151',
  padding: 12,
};

const summaryRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

export default function VersionSelector(): JSX.Element {
  const [config, setConfig] = React.useState<ProjectConfig>(() => readConfigFromStorage() ?? { versions: {} });

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const bridgeConfig = await readConfigFromBridge();
      if (cancelled || !bridgeConfig) {
        return;
      }

      setConfig((prev) => {
        const normalised = normaliseProjectConfig({
          versions: { ...prev.versions, ...bridgeConfig.versions },
        });
        persistConfig(normalised);
        return normalised;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateConfig = React.useCallback(
    (mutator: (prev: ProjectConfig) => ProjectConfig) => {
      setConfig((prev) => {
        const next = normaliseProjectConfig(mutator(prev));
        persistConfig(next);
        return next;
      });
    },
    [],
  );

  const handleToggleVersion = React.useCallback(
    (version: string, enabled: boolean) => {
      updateConfig((prev) => {
        const nextVersions: VersionMap = { ...prev.versions };
        if (enabled) {
          nextVersions[version] = nextVersions[version] ?? DEFAULT_LOADER;
        } else {
          delete nextVersions[version];
        }

        return { versions: nextVersions };
      });
    },
    [updateConfig],
  );

  const handleLoaderChange = React.useCallback(
    (version: string, loader: LoaderOption) => {
      if (!allowedLoaders.has(loader)) {
        return;
      }

      updateConfig((prev) => {
        const nextVersions: VersionMap = { ...prev.versions };
        if (!nextVersions[version]) {
          nextVersions[version] = loader;
        } else {
          nextVersions[version] = loader;
        }
        return { versions: nextVersions };
      });
    },
    [updateConfig],
  );

  const selectedVersions = React.useMemo(() => {
    return VERSION_OPTIONS.filter((version) => version in config.versions);
  }, [config.versions]);

  return (
    <div style={containerStyle}>
      <div>
        <h2 style={headerStyle}>Minecraft Versions</h2>
        <p style={descriptionStyle}>
          Choose the Minecraft versions you want to target. Select a loader for each version to match your
          build pipeline.
        </p>
      </div>

      <div style={versionGridStyle}>
        {VERSION_OPTIONS.map((version) => {
          const isSelected = version in config.versions;
          const selectedLoader = config.versions[version] ?? DEFAULT_LOADER;

          return (
            <label key={version} style={versionCardStyle}>
              <div style={versionHeaderStyle}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(event) => handleToggleVersion(version, event.target.checked)}
                />
                <span>{version}</span>
              </div>

              <select
                style={selectStyle}
                disabled={!isSelected}
                value={selectedLoader}
                onChange={(event) => handleLoaderChange(version, event.target.value as LoaderOption)}
              >
                {LOADER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>

      <div style={summaryStyle}>
        <div style={summaryRowStyle}>
          <span>Selected versions</span>
          <strong>{selectedVersions.length}</strong>
        </div>
        {selectedVersions.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
            {selectedVersions.map((version) => (
              <li key={version}>
                {version} · {config.versions[version] ?? DEFAULT_LOADER}
              </li>
            ))}
          </ul>
        ) : (
          <span style={{ color: '#9ca3af' }}>No versions selected yet.</span>
        )}
      </div>
    </div>
  );
}
