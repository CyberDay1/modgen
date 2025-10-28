const DEFAULT_ENDPOINT = 'https://api.openai.com/v1';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as UnknownRecord;
}

function tryParseJsonObject(source: unknown): UnknownRecord | undefined {
  if (typeof source === 'string') {
    try {
      const parsed = JSON.parse(source);
      return asRecord(parsed);
    } catch (error) {
      return undefined;
    }
  }

  return asRecord(source);
}

function getNested(source: UnknownRecord | undefined, path: string[]): UnknownRecord | undefined {
  let current: unknown = source;

  for (const segment of path) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    current = (current as UnknownRecord)[segment];
  }

  return asRecord(current);
}

function collectEndpointCandidates(settings: UnknownRecord | undefined): string[] {
  if (!settings) {
    return [];
  }

  const candidates: string[] = [];
  const directKeys = [
    'openAIEndpoint',
    'openAiEndpoint',
    'openaiEndpoint',
    'openAIBaseUrl',
    'openAIBaseURL',
    'openaiBaseUrl',
    'openaiBaseURL',
    'openAIUrl',
    'openAiUrl',
    'openaiUrl',
  ];

  for (const key of directKeys) {
    const value = settings[key];
    if (typeof value === 'string') {
      candidates.push(value);
    }
  }

  const candidateContainers: Array<UnknownRecord | undefined> = [
    getNested(settings, ['ai']),
    getNested(settings, ['ai', 'openAI']),
    getNested(settings, ['ai', 'openai']),
    getNested(settings, ['openAI']),
    getNested(settings, ['openai']),
    getNested(settings, ['services', 'openAI']),
    getNested(settings, ['services', 'openai']),
    getNested(settings, ['integrations', 'openAI']),
    getNested(settings, ['integrations', 'openai']),
    getNested(settings, ['providers', 'openAI']),
    getNested(settings, ['providers', 'openai']),
    getNested(settings, ['aiProviders', 'openAI']),
    getNested(settings, ['aiProviders', 'openai']),
  ];

  const endpointKeys = ['endpoint', 'baseUrl', 'baseURL', 'url'];

  for (const container of candidateContainers) {
    if (!container) {
      continue;
    }

    for (const key of endpointKeys) {
      const value = container[key];
      if (typeof value === 'string') {
        candidates.push(value);
      }
    }
  }

  return candidates;
}

function normaliseEndpoint(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = new URL(trimmed);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return undefined;
    }

    const normalised = parsed.toString();
    return normalised.replace(/\/+$/g, '');
  } catch (error) {
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed.replace(/\/+$/g, '');
    }
  }

  return undefined;
}

export function resolveEndpoint(url?: string): string {
  const runtimeProcess =
    typeof globalThis !== 'undefined' && (globalThis as any).process
      ? ((globalThis as any).process as { env?: Record<string, string | undefined> })
      : undefined;
  const runtimeEnv = runtimeProcess?.env ?? {};

  const globalWindow: Record<string, unknown> | undefined =
    typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : undefined;

  const settingsSources: Array<UnknownRecord | undefined> = [
    tryParseJsonObject(runtimeEnv.MODGEN_SETTINGS),
    tryParseJsonObject((globalThis as unknown as Record<string, unknown> | undefined)?.__MODGEN_SETTINGS),
    tryParseJsonObject(globalWindow?.__MODGEN_SETTINGS),
    tryParseJsonObject(globalWindow?.__MODGEN_RUNTIME_CONFIG),
  ];

  const candidateValues: unknown[] = [
    url,
    runtimeEnv.MODGEN_OPENAI_ENDPOINT,
    runtimeEnv.MODGEN_OPENAI_BASE_URL,
    runtimeEnv.OPENAI_BASE_URL,
    runtimeEnv.OPENAI_API_BASE,
    runtimeEnv.OPENAI_ENDPOINT,
    runtimeEnv.VITE_OPENAI_ENDPOINT,
    runtimeEnv.VITE_OPENAI_BASE_URL,
    globalWindow?.__MODGEN_OPENAI_ENDPOINT,
    globalWindow?.OPENAI_ENDPOINT,
    globalWindow?.OPENAI_BASE_URL,
    globalWindow?.__MODGEN_OPENAI_BASE_URL,
  ];

  for (const settings of settingsSources) {
    candidateValues.push(...collectEndpointCandidates(settings));
  }

  for (const candidate of candidateValues) {
    const normalised = normaliseEndpoint(candidate);
    if (normalised) {
      return normalised;
    }
  }

  return DEFAULT_ENDPOINT;
}

export { DEFAULT_ENDPOINT };
