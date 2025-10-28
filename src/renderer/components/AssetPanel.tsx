import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import OpenAI from 'openai';
import { Buffer } from 'buffer';
import type { SavePngResult } from '../../assets/assetStore';
import { savePng } from '../../assets/assetStore';

type StatusKind = 'info' | 'success' | 'error';

type StatusMessage = {
  kind: StatusKind;
  text: string;
};

const panelStyle: React.CSSProperties = {
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  color: '#e5e7eb',
  backgroundColor: '#1f2937',
  borderRadius: 12,
  maxWidth: 420,
};

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  backgroundColor: '#111827',
  padding: 12,
  borderRadius: 10,
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid #374151',
  backgroundColor: '#0f172a',
  color: '#f9fafb',
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 14px',
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

const statusColours: Record<StatusKind, string> = {
  info: '#38bdf8',
  success: '#34d399',
  error: '#f87171',
};

let cachedOpenAIClient: OpenAI | null = null;

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message);
  }

  return String(error);
}

function resolveOpenAIApiKey(): string | undefined {
  const runtimeProcess =
    typeof globalThis !== 'undefined' && (globalThis as any).process
      ? ((globalThis as any).process as { env?: Record<string, string | undefined> })
      : undefined;
  const candidateKeys = [
    runtimeProcess?.env?.OPENAI_API_KEY,
    runtimeProcess?.env?.MODGEN_OPENAI_KEY,
    runtimeProcess?.env?.VITE_OPENAI_API_KEY,
    typeof window !== 'undefined' ? (window as any).OPENAI_API_KEY : undefined,
    typeof window !== 'undefined' ? (window as any).__MODGEN_OPENAI_KEY : undefined,
  ];

  for (const value of candidateKeys) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function getOpenAIClient(): OpenAI {
  if (cachedOpenAIClient) {
    return cachedOpenAIClient;
  }

  const apiKey = resolveOpenAIApiKey();
  if (!apiKey) {
    throw new Error('Set OPENAI_API_KEY to enable AI texture generation.');
  }

  cachedOpenAIClient = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  return cachedOpenAIClient;
}

function normaliseDestinationInput(input: string, fallback: string): string {
  const raw = input.trim().length > 0 ? input.trim() : fallback;
  const withoutLeading = raw.replace(/^[\\/]+/, '');
  const segments = withoutLeading
    .split(/[\\/]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..');

  if (segments.length === 0) {
    throw new Error('Destination must include a file name.');
  }

  let fileName = segments[segments.length - 1];
  if (!fileName.toLowerCase().endsWith('.png')) {
    fileName = `${fileName}.png`;
  }
  segments[segments.length - 1] = fileName;

  return segments.join('/');
}

function buildDefaultPathForFile(file: File): string {
  const withoutExtension = file.name.replace(/\.png$/i, '').replace(/\s+/g, '-');
  const slug = withoutExtension.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  const safe = slug.length > 0 ? slug : 'texture';
  return `textures/${safe}.png`;
}

function defaultGeneratedFileName(prompt: string): string {
  const normalised = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const safe = normalised.length > 0 ? normalised : 'ai-texture';
  return `textures/${safe}.png`;
}

function updateHistory(history: SavePngResult[], entry: SavePngResult): SavePngResult[] {
  const filtered = history.filter((item) => item.assetPath !== entry.assetPath);
  return [entry, ...filtered].slice(0, 10);
}

function createPreviewUrlFromBuffer(buffer: Buffer): string {
  const blob = new Blob([buffer], { type: 'image/png' });
  return URL.createObjectURL(blob);
}

const AssetPanel: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [assetPath, setAssetPath] = useState('');
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<SavePngResult[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const lastDefaultPathRef = useRef<string>('');

  const defaultFilePath = useMemo(() => {
    if (!selectedFile) {
      return 'textures/texture.png';
    }

    return buildDefaultPathForFile(selectedFile);
  }, [selectedFile]);

  const updatePreviewUrl = useCallback((next: string | null) => {
    if (previewUrlRef.current && previewUrlRef.current !== next) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    previewUrlRef.current = next;
    setPreviewUrl(next);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);

    if (!file) {
      setStatus(null);
      updatePreviewUrl(null);
      lastDefaultPathRef.current = '';
      return;
    }

    const nextDefault = buildDefaultPathForFile(file);
    const previousDefault = lastDefaultPathRef.current;
    lastDefaultPathRef.current = nextDefault;

    setAssetPath((current) => {
      if (!current || current === previousDefault) {
        return nextDefault;
      }

      return current;
    });

    setStatus(null);
    updatePreviewUrl(URL.createObjectURL(file));
  }, [updatePreviewUrl]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setStatus({ kind: 'error', text: 'Select a PNG file to upload.' });
      return;
    }

    setIsUploading(true);
    setStatus({ kind: 'info', text: 'Saving PNG to project assets…' });

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const finalDest = normaliseDestinationInput(assetPath, defaultFilePath);
      const result = savePng(buffer, finalDest);

      setHistory((current) => updateHistory(current, result));
      updatePreviewUrl(createPreviewUrlFromBuffer(buffer));
      setAssetPath(finalDest);
      setStatus({ kind: 'success', text: `Saved texture to ${finalDest}.` });
    } catch (error) {
      setStatus({ kind: 'error', text: toErrorMessage(error) });
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, assetPath, defaultFilePath, updatePreviewUrl]);

  const handleGenerate = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length === 0) {
      setStatus({ kind: 'error', text: 'Enter a prompt for AI texture generation.' });
      return;
    }

    setIsGenerating(true);
    setStatus({ kind: 'info', text: 'Requesting texture from OpenAI…' });

    try {
      const client = getOpenAIClient();
      const response = await client.images.generate({
        prompt: trimmedPrompt,
        size: '512x512',
        response_format: 'b64_json',
      });

      const base64 = response.data?.[0]?.b64_json;
      if (!base64) {
        throw new Error('OpenAI did not return image data for the prompt.');
      }

      const buffer = Buffer.from(base64, 'base64');
      const fallbackName = defaultGeneratedFileName(trimmedPrompt);
      const finalDest = normaliseDestinationInput(assetPath, fallbackName);
      const result = savePng(buffer, finalDest);

      setHistory((current) => updateHistory(current, result));
      updatePreviewUrl(createPreviewUrlFromBuffer(buffer));
      setSelectedFile(null);
      setAssetPath(finalDest);
      setStatus({ kind: 'success', text: `Generated texture saved to ${finalDest}.` });
    } catch (error) {
      setStatus({ kind: 'error', text: toErrorMessage(error) });
    } finally {
      setIsGenerating(false);
    }
  }, [assetPath, prompt, updatePreviewUrl]);

  const canUpload = Boolean(selectedFile) && !isUploading && !isGenerating;
  const canGenerate = !isGenerating && !isUploading;

  return (
    <div style={panelStyle}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Assets</h2>

      <div style={sectionStyle}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Upload PNG</h3>
        <input type="file" accept="image/png" onChange={handleFileChange} />
        <label style={{ fontSize: 14, fontWeight: 600 }}>Asset destination</label>
        <input
          style={inputStyle}
          value={assetPath}
          onChange={(event) => setAssetPath(event.target.value)}
          placeholder="textures/blocks/stone.png"
        />
        <button
          type="button"
          style={canUpload ? buttonStyle : disabledButtonStyle}
          onClick={handleUpload}
          disabled={!canUpload}
        >
          Save to project
        </button>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ margin: 0, fontSize: 18 }}>AI Texture Generator</h3>
        <label style={{ fontSize: 14, fontWeight: 600 }}>Prompt</label>
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe the texture you want to generate"
        />
        <button
          type="button"
          style={canGenerate ? buttonStyle : disabledButtonStyle}
          onClick={handleGenerate}
          disabled={!canGenerate}
        >
          Generate with OpenAI
        </button>
      </div>

      {status ? (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            backgroundColor: '#0f172a',
            border: `1px solid ${statusColours[status.kind]}`,
            color: statusColours[status.kind],
          }}
        >
          {status.text}
        </div>
      ) : null}

      {previewUrl ? (
        <div style={sectionStyle}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Preview</h3>
          <img
            src={previewUrl}
            alt="Texture preview"
            style={{ width: '100%', borderRadius: 8, backgroundColor: '#0f172a' }}
          />
        </div>
      ) : null}

      {history.length > 0 ? (
        <div style={sectionStyle}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Recent saves</h3>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
            {history.map((entry) => (
              <li key={entry.assetPath}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span>Asset: {entry.assetPath}</span>
                  <span>Generated: {entry.generatedPath}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default AssetPanel;
