import React, { useCallback, useMemo, useState } from 'react';


const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 6,
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 8,
  border: 'none',
  backgroundColor: '#2563eb',
  color: '#f8fafc',
  cursor: 'pointer',
  fontWeight: 600,
};

const disabledButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#1e3a8a',
  opacity: 0.6,
  cursor: 'not-allowed',
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message);
  }

  return String(error);
}

function resolveProjectDirectory(): string | undefined {
  if (typeof window !== 'undefined') {
    const anyWindow = window as typeof window & { [key: string]: any };
    const bridgeDirectory =
      anyWindow.modgen?.project?.rootDirectory ??
      anyWindow.modgen?.project?.rootPath ??
      anyWindow.modgen?.project?.directory ??
      anyWindow.modgen?.paths?.projectRoot ??
      anyWindow.modgen?.paths?.project ??
      anyWindow.__MODGEN_PROJECT_DIR;

    if (typeof bridgeDirectory === 'string' && bridgeDirectory.trim().length > 0) {
      return bridgeDirectory;
    }
  }

  if (typeof process !== 'undefined') {
    const candidates: (string | undefined)[] = [
      (process as any).env?.MODGEN_PROJECT_DIR,
      (process as any).env?.PROJECT_DIR,
      (process as any).env?.PWD,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }

    if (typeof (process as any).cwd === 'function') {
      try {
        return (process as any).cwd();
      } catch (error) {
        console.warn('Failed to resolve process cwd', error);
      }
    }
  }

  return undefined;
}

async function invokeElectronShell(projectDir: string): Promise<boolean> {
  const anyWindow = window as typeof window & { [key: string]: any };
  const dynamicRequire = anyWindow.require ?? anyWindow.nodeRequire;

  if (dynamicRequire) {
    try {
      const electron = dynamicRequire('electron');
      const shell = electron?.shell;
      if (shell?.openPath) {
        const result = await Promise.resolve(shell.openPath(projectDir));
        if (typeof result === 'string' && result.length > 0) {
          throw new Error(result);
        }
        return true;
      }

      if (shell?.openExternal) {
        await Promise.resolve(shell.openExternal(projectDir));
        return true;
      }
    } catch (error) {
      console.warn('Failed to open directory via electron shell', error);
    }

    try {
      const childProcess = dynamicRequire('child_process');
      const exec: ((command: string, callback: (error: unknown) => void) => void) | undefined =
        childProcess?.exec;
      if (typeof exec === 'function') {
        const command = buildOpenCommand(projectDir);
        if (!command) {
          throw new Error('Unsupported platform for shell open command');
        }

        await new Promise<void>((resolve, reject) => {
          try {
            exec(command, (error: unknown) => {
              if (error) {
                reject(error);
                return;
              }
              resolve();
            });
          } catch (error) {
            reject(error);
          }
        });
        return true;
      }
    } catch (error) {
      console.warn('Failed to open directory via system shell', error);
    }
  }

  const modgenCommand = anyWindow.modgen?.commands?.openProjectDirectory;
  if (typeof modgenCommand === 'function') {
    await Promise.resolve(modgenCommand());
    return true;
  }

  const electronApi = anyWindow.electronAPI?.openProjectDirectory;
  if (typeof electronApi === 'function') {
    await Promise.resolve(electronApi());
    return true;
  }

  return false;
}

function buildOpenCommand(projectDir: string): string | undefined {
  const quoted = projectDir.replace(/"/g, '\\"');
  if (typeof process === 'undefined') {
    return undefined;
  }

  const platform = (process as any).platform;
  if (platform === 'win32') {
    return `start "" "${quoted}"`;
  }

  if (platform === 'darwin') {
    return `open "${quoted}"`;
  }

  if (platform) {
    return `xdg-open "${quoted}"`;
  }

  return undefined;
}

export default function OpenInIDE(): JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  const projectDirectory = useMemo(() => resolveProjectDirectory(), []);

  const handleClick = useCallback(async () => {
    setError(null);

    if (!projectDirectory) {
      setError('Project directory is not available');
      return;
    }

    try {
      setIsOpening(true);
      const success = await invokeElectronShell(projectDirectory);
      if (!success) {
        throw new Error('Unable to open project directory with current runtime');
      }
    } catch (error) {
      setError(toErrorMessage(error));
    } finally {
      setIsOpening(false);
    }
  }, [projectDirectory]);

  return (
    <div style={containerStyle}>
      <button
        type="button"
        onClick={handleClick}
        style={isOpening ? disabledButtonStyle : buttonStyle}
        disabled={isOpening}
      >
        {isOpening ? 'Opening…' : 'Open in IDE'}
      </button>
      {projectDirectory ? null : (
        <span style={{ color: '#facc15', fontSize: 12 }}>
          Project directory unavailable. Configure project settings to enable quick access.
        </span>
      )}
      {error ? (
        <span style={{ color: '#f87171', fontSize: 12 }}>Failed to open project: {error}</span>
      ) : null}
    </div>
  );
}

